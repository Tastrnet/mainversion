import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type CuisineNodeType = "category" | "cuisine";

interface CuisineNode {
  name: string;
  level: number;
  type: CuisineNodeType;
  children: CuisineNode[];
  cuisineData?: any;
}

interface HierarchicalCuisineFilterProps {
  selectedCuisine: string;
  onCuisineSelect: (cuisineName: string) => void;
  availableCuisines?: Set<string>; // Optional: only show cuisines in this set
}

const HierarchicalCuisineFilter = ({ 
  selectedCuisine, 
  onCuisineSelect,
  availableCuisines
}: HierarchicalCuisineFilterProps) => {
  const [cuisineTree, setCuisineTree] = useState<CuisineNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Helper to check if a cuisine is available (case-insensitive, trimmed)
  // This checks directly against availableCuisines Set for reliability
  const isCuisineAvailable = (cuisineName: string, availableMap: Map<string, string>): boolean => {
    if (!availableCuisines || availableCuisines.size === 0) return true;
    
    if (!cuisineName || typeof cuisineName !== 'string') return false;
    
    const trimmed = cuisineName.trim();
    if (!trimmed) return false;
    
    const normalized = trimmed.toLowerCase();
    
    // Primary check: normalized map (fast O(1) lookup)
    if (availableMap.has(normalized)) return true;
    
    // Secondary check: Direct iteration through Set with case-insensitive matching
    // This ensures we catch all matches even if map has issues
    for (const available of availableCuisines) {
      if (!available || typeof available !== 'string') continue;
      const availableTrimmed = available.trim();
      if (!availableTrimmed) continue;
      
      if (availableTrimmed.toLowerCase() === normalized) {
        // Found match - add to map for future lookups
        if (!availableMap.has(normalized)) {
          availableMap.set(normalized, availableTrimmed);
        }
        return true;
      }
    }
    
    return false;
  };

  const getNodeKey = (node: CuisineNode) => `${node.type}-${node.name}-${node.level}`;

  useEffect(() => {
    fetchAndBuildCuisineTree();
  }, [availableCuisines, selectedCuisine]);

  useEffect(() => {
    // Auto-expand path to selected cuisine
    if (selectedCuisine && selectedCuisine !== 'Any') {
      expandPathToCuisine(selectedCuisine);
    }
  }, [selectedCuisine, cuisineTree]);

  const fetchAndBuildCuisineTree = async () => {
    const { data: cuisines } = await supabase
      .from("cuisines")
      .select("*")
      .eq("is_active", true)
      .order(
        "cuisine_category_1, cuisine_category_2, cuisine_category_3, cuisine_category_4, cuisine_category_5, name"
      );

    if (!cuisines) {
      setCuisineTree([]);
      return;
    }

    setCuisineTree(buildCuisineTree(cuisines));
  };

  const buildCuisineTree = (cuisines: any[]): CuisineNode[] => {
    const rootNodes: CuisineNode[] = [];

    // Create a normalized map of available cuisines for fast lookup
    // Ensure ALL available cuisines are in the map for reliable matching
    const availableCuisinesMap = new Map<string, string>(); // normalized -> original
    if (availableCuisines && availableCuisines.size > 0) {
      // Add all available cuisines to the map with normalized keys
      availableCuisines.forEach(cuisine => {
        if (cuisine && typeof cuisine === 'string') {
          const trimmed = cuisine.trim();
          const normalized = trimmed.toLowerCase();
          // Always update map to ensure consistency
          availableCuisinesMap.set(normalized, trimmed);
        }
      });
    }

    // Build tree from ALL cuisines first, then filter/keep only available ones
    // This ensures complete category paths are built, even if some cuisines aren't available
    cuisines.forEach((cuisine) => {
      let currentChildren = rootNodes;
      let currentLevel = 1;
      const pathCategoryValues: string[] = []; // Track all category values in the path

      // Build the category path
      for (; currentLevel <= 5; currentLevel++) {
        const categoryValue = cuisine[`cuisine_category_${currentLevel}`];
        if (!categoryValue) break;

        pathCategoryValues.push(categoryValue);

        let existingNode = currentChildren.find(
          (node) => node.name === categoryValue && node.type === "category"
        );

        if (!existingNode) {
          existingNode = {
            name: categoryValue,
            level: currentLevel,
            type: "category",
            children: [],
          };
          currentChildren.push(existingNode);
        }

        currentChildren = existingNode.children;
      }

      // Check if a node with the same name already exists at the current level
      const existingNode = currentChildren.find(
        (node) => node.name === cuisine.name
      );

      // Only create a cuisine node if there's no node with the same name
      // This prevents duplicates at the same level
      if (!existingNode) {
        // Check if the cuisine name matches the last category value
        // If so, skip creating it to avoid duplicate (category node is already selectable)
        const lastCategoryValue = pathCategoryValues.length > 0 ? pathCategoryValues[pathCategoryValues.length - 1] : null;
        
        if (lastCategoryValue !== cuisine.name) {
          const cuisineNode: CuisineNode = {
            name: cuisine.name,
            level: currentLevel,
            type: "cuisine",
            children: [],
            cuisineData: cuisine,
          };
          currentChildren.push(cuisineNode);
        }
        // If lastCategoryValue === cuisine.name, skip creating duplicate - category node is selectable
      }
    });

    // Always prune empty branches, but keep nodes that are available or selected
    return pruneEmptyBranches(rootNodes, availableCuisinesMap);
  };

  const pruneEmptyBranches = (nodes: CuisineNode[], availableMap: Map<string, string>): CuisineNode[] => {
    return nodes
      .map(node => {
        if (node.type === "cuisine") {
          // Keep cuisine nodes that are:
          // 1. In availableCuisines (if availableCuisines is provided) - case-insensitive check
          // 2. Currently selected
          // 3. Always show if no availableCuisines filter is applied
          const nodeNameTrimmed = node.name.trim();
          const isAvailable = isCuisineAvailable(node.name, availableMap);
          const isSelected = selectedCuisine && selectedCuisine !== 'Any' && nodeNameTrimmed === selectedCuisine.trim();
          
          if (isAvailable || isSelected) {
            return node;
          }
          // Hide cuisine nodes that aren't available (unless selected)
          return null;
        } else {
          // For category nodes, recursively prune children
          const prunedChildren = pruneEmptyBranches(node.children, availableMap);
          
          // Check if this category or any of its descendants are available/selected
          const hasAvailableDescendant = prunedChildren.length > 0;
          const categoryNameTrimmed = node.name.trim();
          const categoryIsAvailable = isCuisineAvailable(node.name, availableMap);
          const categoryIsSelected = selectedCuisine && selectedCuisine !== 'Any' && categoryNameTrimmed === selectedCuisine.trim();
          
          // Keep category if:
          // 1. It has children after pruning (some descendants are available)
          // 2. The category name itself is available as a cuisine (IMPORTANT: keep even if no children)
          // 3. The category name is currently selected
          if (hasAvailableDescendant || categoryIsAvailable || categoryIsSelected) {
            return {
              ...node,
              children: prunedChildren
            };
          }
          
          // Remove category branches that have no available descendants AND aren't available themselves
          return null;
        }
      })
      .filter((node): node is CuisineNode => node !== null);
  };

  const expandPathToCuisine = (cuisineName: string) => {
    const newExpanded = new Set<string>();
    
    const findAndExpandPath = (nodes: CuisineNode[], path: string[] = []): boolean => {
      for (const node of nodes) {
        const nodeKey = getNodeKey(node);
        const currentPath = [...path, nodeKey];
        
        if (node.type === "cuisine" && node.name === cuisineName) {
          // Found the cuisine, expand all nodes in the path
          path.forEach(nodeKeyValue => newExpanded.add(nodeKeyValue));
          return true;
        }
        
        if (findAndExpandPath(node.children, currentPath)) {
          newExpanded.add(nodeKey);
          return true;
        }
      }
      return false;
    };

    findAndExpandPath(cuisineTree);
    setExpandedNodes(newExpanded);
  };

  const toggleExpand = (node: CuisineNode) => {
    const key = getNodeKey(node);
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedNodes(newExpanded);
  };

  const renderCuisineNode = (node: CuisineNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpandable = node.type === "category" && hasChildren;
    const nodeKey = getNodeKey(node);
    const isExpanded = expandedNodes.has(nodeKey);
    const isSelected = selectedCuisine === node.name;
    
    return (
      <div key={nodeKey} className="select-none">
        <div 
          className="flex items-center gap-1 py-0.5"
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          {isExpandable ? (
            <button
              onClick={() => toggleExpand(node)}
              className="flex items-center justify-center w-4 h-4 rounded hover:bg-muted/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}
          
          <button
            onClick={() => onCuisineSelect(node.name)}
            className={`flex-1 text-left px-2 py-1 rounded-md text-sm transition-colors ${
              isSelected 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'hover:bg-muted/50'
            }`}
          >
            {node.name}
          </button>
        </div>

          {isExpandable && isExpanded && (
          <div className="mt-0.5">
            {node.children.map(child => renderCuisineNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-h-64 overflow-y-auto space-y-1">
      <button
        onClick={() => onCuisineSelect('Any')}
        className={`w-full text-left px-2 py-1 rounded-md text-sm transition-colors ${
          selectedCuisine === 'Any'
            ? 'bg-primary/10 text-primary font-medium' 
            : 'hover:bg-muted/50'
        }`}
      >
        Any
      </button>
      
      {cuisineTree.map(node => renderCuisineNode(node))}
    </div>
  );
};

export default HierarchicalCuisineFilter;

-- Insert fake users that match some of the existing profile usernames
-- We'll create auth entries and profiles for testing
INSERT INTO profiles (user_id, username, full_name, birth_year, gender, bio, avatar_url) VALUES
('fake-user-001', 'foodie_alex', 'Alex Johnson', 1992, 'non-binary', 'Passionate about discovering hidden culinary gems in the city. Love trying new cuisines!', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
('fake-user-002', 'chef_maria', 'Maria Rodriguez', 1985, 'female', 'Professional chef with 15 years experience. Always exploring flavors from around the world.', 'https://images.unsplash.com/photo-1494790108755-2616c78a96ae?w=150'),
('fake-user-003', 'mike_eats', 'Michael Chen', 1990, 'male', 'Weekend warrior foodie. Pizza is life! 🍕', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'),
('fake-user-004', 'sarah_tastes', 'Sarah Williams', 1988, 'female', 'Food blogger and restaurant critic. Always looking for the next great meal to share with my followers.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'),
('fake-user-005', 'hungry_david', 'David Park', 1995, 'male', 'College student with expensive taste on a budget. Love finding great value meals!', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'),
('fake-user-006', 'gourmet_lisa', 'Lisa Thompson', 1982, 'female', 'Wine enthusiast and fine dining lover. Life is too short for bad food and cheap wine.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'),
('fake-user-007', 'james_bites', 'James Anderson', 1993, 'male', 'BBQ master and meat lover. If it''s not smoked, I''m not interested.', 'https://images.unsplash.com/photo-1558507652-2d9626c4e67a?w=150'),
('fake-user-008', 'vegan_emma', 'Emma Davis', 1991, 'female', 'Plant-based food advocate. Proving that vegan food can be absolutely delicious!', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150'),
('fake-user-009', 'pizza_pete', 'Peter Brown', 1994, 'male', 'Pizza connoisseur. Trying every slice in the city!', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
('fake-user-010', 'sushi_sam', 'Samantha Clark', 1993, 'female', 'Sushi addict and Japanese culture enthusiast. Omakase is my favorite dining experience.', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150');
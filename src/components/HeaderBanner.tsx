import { useNavigate } from "react-router-dom";

type HeaderBannerProps = {
  title?: string;
};

const HeaderBanner = ({ title = "tastr." }: HeaderBannerProps) => {
  const navigate = useNavigate();

  return (
    <div 
      className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-50 safe-area-top"
      style={{ 
        paddingTop: `calc(0.75rem + env(safe-area-inset-top))`,
        paddingBottom: '0.75rem',
        paddingLeft: '0.75rem',
        paddingRight: '0.75rem'
      }}
    >
      <h1
        className="tastr-logo text-2xl text-center cursor-pointer"
        onClick={() => navigate("/start")}
      >
        {title}
      </h1>
    </div>
  );
};

export default HeaderBanner;
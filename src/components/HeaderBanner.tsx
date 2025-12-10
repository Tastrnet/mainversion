import { useNavigate } from "react-router-dom";

type HeaderBannerProps = {
  title?: string;
};

const HeaderBanner = ({ title = "tastr." }: HeaderBannerProps) => {
  const navigate = useNavigate();

  return (
    <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border p-3 z-50 safe-area-top">
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
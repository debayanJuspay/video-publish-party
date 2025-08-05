import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10">
      <div className="text-center max-w-4xl mx-auto px-4">
        <h1 className="text-6xl font-bold mb-8 text-foreground">
          VideoHub
        </h1>
        <p className="text-xl mb-8 text-muted-foreground leading-relaxed">
          Streamline your video content workflow. Upload, review, and publish videos to YouTube with team collaboration.
        </p>
        <div className="space-y-4">
          <Button size="lg" onClick={() => navigate('/auth')}>
            Get Started
          </Button>
          <p className="text-sm text-muted-foreground">
            Manage multiple editors • Admin review system • Direct YouTube publishing
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;

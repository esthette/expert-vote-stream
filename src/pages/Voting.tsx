import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";

const Voting = () => {
  const { sessionId } = useParams();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Card className="p-8 shadow-card">
          <h1 className="text-3xl font-bold mb-4">Голосование</h1>
          <p className="text-muted-foreground">
            Сессия ID: {sessionId}
          </p>
          <p className="text-muted-foreground mt-4">
            Ожидание начала голосования...
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Voting;

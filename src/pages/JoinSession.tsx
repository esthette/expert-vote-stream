import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const JoinSession = () => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState("");
  const [nickname, setNickname] = useState("");

  const handleJoin = () => {
    if (!sessionId.trim()) {
      toast.error("Введите ID сессии");
      return;
    }

    if (!nickname.trim()) {
      toast.error("Введите ваш никнейм");
      return;
    }

    // TODO: Join session
    toast.success("Вы присоединились к сессии!");
    // navigate to voting page
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <Card className="p-8 shadow-card">
          <h1 className="text-3xl font-bold mb-2">Присоединиться к сессии</h1>
          <p className="text-muted-foreground mb-8">
            Введите ID сессии и выберите никнейм
          </p>

          <div className="space-y-6">
            <div>
              <Label htmlFor="sessionId">ID сессии</Label>
              <Input
                id="sessionId"
                placeholder="Введите код сессии"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="nickname">Ваш никнейм</Label>
              <Input
                id="nickname"
                placeholder="Как к вам обращаться?"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="mt-2"
              />
            </div>

            <Button
              onClick={handleJoin}
              size="lg"
              className="w-full mt-8"
            >
              Присоединиться
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Если у вас есть QR-код, отсканируйте его камерой телефона
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default JoinSession;

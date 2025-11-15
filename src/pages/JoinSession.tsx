import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Input validation schemas
const nicknameSchema = z.string()
  .trim()
  .min(2, 'Минимум 2 символа')
  .max(50, 'Максимум 50 символов')
  .regex(/^[a-zA-Zа-яА-Я0-9\s-]+$/, 'Разрешены только буквы, цифры, пробелы и дефисы');

const sessionCodeSchema = z.string()
  .trim()
  .length(6, 'Код сессии должен содержать 6 символов')
  .regex(/^\d{6}$/, 'Код сессии должен содержать только цифры');

const JoinSession = () => {
  const navigate = useNavigate();
  const { sessionCode: urlSessionCode } = useParams();
  const [sessionId, setSessionId] = useState(urlSessionCode || "");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlSessionCode) {
      setSessionId(urlSessionCode);
    }
  }, [urlSessionCode]);

  const handleJoin = async () => {
    // Validate session code
    const sessionCodeResult = sessionCodeSchema.safeParse(sessionId);
    if (!sessionCodeResult.success) {
      toast.error(sessionCodeResult.error.errors[0].message);
      return;
    }

    // Validate nickname
    const nicknameResult = nicknameSchema.safeParse(nickname);
    if (!nicknameResult.success) {
      toast.error(nicknameResult.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Check if user is authenticated
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession) {
        toast.error("Для присоединения к сессии необходимо войти в систему");
        navigate('/auth');
        return;
      }

      // Find session by code
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('session_code', sessionId)
        .single();

      if (sessionError || !session) {
        toast.error("Сессия не найдена");
        setLoading(false);
        return;
      }

      // Create expert record with user_id (using validated values)
      const { error: expertError } = await supabase
        .from('experts')
        .insert({
          session_id: session.id,
          nickname: nicknameResult.data,
          user_id: authSession.user.id
        });

      if (expertError) {
        console.error('Error joining session:', expertError);
        toast.error("Ошибка при присоединении к сессии");
        setLoading(false);
        return;
      }

      toast.success("Вы присоединились к сессии!");
      navigate(`/voting/${session.id}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Произошла ошибка");
      setLoading(false);
    }
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
              disabled={loading}
            >
              {loading ? "Присоединение..." : "Присоединиться"}
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

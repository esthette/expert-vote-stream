import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Copy, Users, Box } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

interface Session {
  id: string;
  session_name: string;
  session_code: string;
  experts_count: number;
  objects_count: number;
  method: string;
  status: string;
}

const AdminSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [expertsJoined, setExpertsJoined] = useState(0);
  const [loading, setLoading] = useState(true);

  const joinUrl = `${window.location.origin}/join/${session?.session_code}`;

  useEffect(() => {
    if (!sessionId) return;

    const fetchSession = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Необходима авторизация");
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Error fetching session:', error);
        toast.error("Ошибка загрузки сессии");
        navigate('/');
        return;
      }

      // Verify user is the session creator
      if (data.created_by !== user.id) {
        toast.error("У вас нет доступа к этой сессии");
        navigate('/');
        return;
      }

      setSession(data);
      setLoading(false);
    };

    fetchSession();

    // Subscribe to experts joining
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'experts',
          filter: `session_id=eq.${sessionId}`
        },
        async () => {
          const { count } = await supabase
            .from('experts')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId);
          
          setExpertsJoined(count || 0);
        }
      )
      .subscribe();

    // Initial count
    supabase
      .from('experts')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .then(({ count }) => setExpertsJoined(count || 0));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, navigate]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Скопировано в буфер обмена!");
  };

  const handleStartVoting = async () => {
    if (!session) return;

    if (expertsJoined < 2) {
      toast.error("Минимум 2 эксперта должны присоединиться");
      return;
    }

    const { error } = await supabase
      .from('sessions')
      .update({ status: 'voting' })
      .eq('id', session.id);

    if (error) {
      console.error('Error starting voting:', error);
      toast.error("Ошибка при запуске голосования");
      return;
    }

    toast.success("Голосование начато!");
    navigate(`/voting/${session.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  if (!session) return null;

  const methodNames: Record<string, string> = {
    ranking: "Ранжирование с расчетом коэффициента конкордации",
    pairwise: "Парное сравнение",
    direct: "Непосредственная оценка",
    churchman: "Последовательное сравнение (метод Черчмена-Акоффа)"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="max-w-5xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          На главную
        </Button>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 shadow-card">
            <h1 className="text-3xl font-bold mb-2">{session.session_name}</h1>
            <p className="text-muted-foreground mb-6">{methodNames[session.method]}</p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-medium">Эксперты</div>
                  <div className="text-sm text-muted-foreground">
                    {expertsJoined} из {session.experts_count} присоединились
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                <Box className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-medium">Объекты оценки</div>
                  <div className="text-sm text-muted-foreground">
                    {session.objects_count} объектов
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleStartVoting}
                  size="lg"
                  className="w-full"
                  disabled={expertsJoined < 2}
                >
                  Начать голосование
                </Button>
                {expertsJoined < 2 && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Ожидание экспертов...
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-8 shadow-card">
            <h2 className="text-2xl font-bold mb-6">Присоединиться к сессии</h2>
            
            <div className="flex flex-col items-center mb-6">
              <div className="bg-white p-4 rounded-lg mb-4">
                <QRCodeSVG value={joinUrl} size={200} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Отсканируйте QR-код для присоединения
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Код сессии</label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-2xl text-center">
                    {session.session_code}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(session.session_code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Ссылка для присоединения</label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg text-sm truncate">
                    {joinUrl}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(joinUrl)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminSession;

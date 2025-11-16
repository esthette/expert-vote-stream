import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { RankingVoting } from "@/components/voting/RankingVoting";
import { DirectVoting } from "@/components/voting/DirectVoting";
import { PairwiseVoting } from "@/components/voting/PairwiseVoting";
import { ChurchmanVoting } from "@/components/voting/ChurchmanVoting";

interface Session {
  id: string;
  session_name: string;
  session_code: string;
  experts_count: number;
  objects_count: number;
  method: string;
  status: string;
}

interface Expert {
  id: string;
  nickname: string;
  user_id: string;
}

interface VotingObject {
  id: string;
  object_name: string;
  object_order: number;
}

const Voting = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [expert, setExpert] = useState<Expert | null>(null);
  const [objects, setObjects] = useState<VotingObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [objectNames, setObjectNames] = useState<string[]>([]);
  const [isCreatingObjects, setIsCreatingObjects] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Необходима авторизация");
          navigate('/join');
          return;
        }

        // Fetch session
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) {
          console.error('Error fetching session:', sessionError);
          toast.error("Ошибка загрузки сессии");
          navigate('/');
          return;
        }

        setSession(sessionData);
        
        // Check if user is admin
        setIsAdmin(sessionData.created_by === user.id);

        // Fetch expert record
        const { data: expertData, error: expertError } = await supabase
          .from('experts')
          .select('*')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .single();

        if (expertError) {
          console.error('Error fetching expert:', expertError);
          toast.error("Вы не являетесь участником этой сессии");
          navigate('/join');
          return;
        }

        setExpert(expertData);

        // Fetch objects
        const { data: objectsData, error: objectsError } = await supabase
          .from('objects')
          .select('*')
          .eq('session_id', sessionId)
          .order('object_order', { ascending: true });

        if (objectsError) {
          console.error('Error fetching objects:', objectsError);
        } else if (objectsData) {
          setObjects(objectsData);
          // Initialize object names array if objects already exist
          if (objectsData.length === 0 && sessionData) {
            setObjectNames(Array(sessionData.objects_count).fill(''));
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error in fetchData:', error);
        toast.error("Произошла ошибка");
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to session status changes
    const sessionChannel = supabase
      .channel(`session-status-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          setSession(payload.new as Session);
        }
      )
      .subscribe();

    // Subscribe to objects changes
    const objectsChannel = supabase
      .channel(`objects-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'objects',
          filter: `session_id=eq.${sessionId}`
        },
        async () => {
          // Refetch objects when new ones are created
          const { data: objectsData } = await supabase
            .from('objects')
            .select('*')
            .eq('session_id', sessionId)
            .order('object_order', { ascending: true });
          
          if (objectsData) {
            setObjects(objectsData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(objectsChannel);
    };
  }, [sessionId, navigate]);

  const handleCreateObjects = async () => {
    if (!session || !expert) return;

    // Define validation schema for object names
    const objectNameSchema = z.string()
      .trim()
      .min(1, 'Имя объекта не может быть пустым')
      .max(200, 'Имя объекта должно быть короче 200 символов')
      .regex(/^[а-яА-Яa-zA-Z0-9\s\-.,()]+$/, 'Недопустимые символы в имени объекта');

    // Validate all object names
    const validationResults = objectNames.map((name, index) => ({
      index,
      result: objectNameSchema.safeParse(name)
    }));

    const firstError = validationResults.find(v => !v.result.success);
    if (firstError) {
      toast.error(`Объект ${firstError.index + 1}: ${firstError.result.error.errors[0].message}`);
      return;
    }

    // Check all objects have names
    if (validationResults.length !== session.objects_count) {
      toast.error(`Необходимо указать все ${session.objects_count} объектов`);
      return;
    }

    setIsCreatingObjects(true);

    try {
      // Create objects with validated names
      const objectsToInsert = objectNames.map((name, index) => ({
        session_id: session.id,
        object_name: name.trim(),
        object_order: index + 1
      }));

      const { data, error } = await supabase
        .from('objects')
        .insert(objectsToInsert)
        .select();

      if (error) {
        console.error('Error creating objects:', error);
        toast.error("Ошибка создания объектов");
        return;
      }

      setObjects(data || []);
      toast.success("Объекты созданы!");
    } catch (error) {
      console.error('Error in handleCreateObjects:', error);
      toast.error("Произошла ошибка");
    } finally {
      setIsCreatingObjects(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  if (!session || !expert) return null;

  const methodNames: Record<string, string> = {
    ranking: "Ранжирование с расчетом коэффициента конкордации",
    pairwise: "Парное сравнение",
    direct: "Непосредственная оценка",
    churchman: "Последовательное сравнение (метод Черчмена-Акоффа)"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          На главную
        </Button>

        <Card className="p-8 shadow-card">
          <h1 className="text-3xl font-bold mb-2">{session.session_name}</h1>
          <p className="text-muted-foreground mb-2">{methodNames[session.method]}</p>
          <p className="text-sm text-muted-foreground mb-6">
            Эксперт: <span className="font-medium">{expert.nickname}</span>
          </p>

          {session.status === 'waiting' && (
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground">
                Ожидание начала голосования...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Администратор скоро начнёт голосование
              </p>
            </div>
          )}

          {session.status === 'voting' && objects.length === 0 && isAdmin && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Укажите объекты для оценки
                </h2>
                <p className="text-muted-foreground mb-4">
                  Введите названия {session.objects_count} объектов, которые будут оцениваться:
                </p>
                <div className="space-y-3">
                  {Array.from({ length: session.objects_count }).map((_, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <span className="text-sm font-medium w-8">{index + 1}.</span>
                      <Input
                        placeholder={`Объект ${index + 1}`}
                        value={objectNames[index] || ''}
                        onChange={(e) => {
                          const newNames = [...objectNames];
                          newNames[index] = e.target.value;
                          setObjectNames(newNames);
                        }}
                      />
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleCreateObjects}
                  className="w-full mt-6"
                  disabled={isCreatingObjects}
                >
                  {isCreatingObjects ? "Создание..." : "Создать объекты"}
                </Button>
              </div>
            </div>
          )}

          {session.status === 'voting' && objects.length === 0 && !isAdmin && (
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground">
                Ожидание создания объектов...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Администратор сейчас создаёт объекты для оценки
              </p>
            </div>
          )}

          {session.status === 'voting' && objects.length > 0 && !expert && isAdmin && (
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground">
                Администраторы не могут голосовать
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Вы можете только наблюдать за процессом голосования
              </p>
            </div>
          )}

          {session.status === 'voting' && objects.length > 0 && expert && (
            <div className="space-y-6">
              {session.method === 'ranking' && (
                <RankingVoting 
                  objects={objects} 
                  expertId={expert.id} 
                  sessionId={session.id}
                />
              )}
              {session.method === 'direct' && (
                <DirectVoting 
                  objects={objects} 
                  expertId={expert.id} 
                  sessionId={session.id}
                />
              )}
              {session.method === 'pairwise' && (
                <PairwiseVoting 
                  objects={objects} 
                  expertId={expert.id} 
                  sessionId={session.id}
                />
              )}
              {session.method === 'churchman' && (
                <ChurchmanVoting 
                  objects={objects} 
                  expertId={expert.id} 
                  sessionId={session.id}
                />
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Voting;

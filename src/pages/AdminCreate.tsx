import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminCreate = () => {
  const navigate = useNavigate();
  const [expertsCount, setExpertsCount] = useState("3");
  const [objectsCount, setObjectsCount] = useState("5");
  const [method, setMethod] = useState("ranking");
  const [sessionName, setSessionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const methods = [
    { id: "ranking", name: "Ранжирование с расчетом коэффициента конкордации" },
    { id: "pairwise", name: "Парное сравнение" },
    { id: "direct", name: "Непосредственная оценка" },
    { id: "churchman", name: "Последовательное сравнение (метод Черчмена-Акоффа)" },
  ];

  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      toast.error("Введите название сессии");
      return;
    }

    if (parseInt(expertsCount) < 2) {
      toast.error("Минимум 2 эксперта");
      return;
    }

    if (parseInt(objectsCount) < 2) {
      toast.error("Минимум 2 объекта");
      return;
    }

    setIsCreating(true);

    try {
      // Sign in anonymously to get a user ID
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      
      if (authError || !authData.user) {
        console.error('Error signing in:', authError);
        toast.error("Ошибка аутентификации");
        setIsCreating(false);
        return;
      }

      // Generate session code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_session_code');
      
      if (codeError) {
        console.error('Error generating code:', codeError);
        toast.error("Ошибка при создании кода сессии");
        setIsCreating(false);
        return;
      }

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          session_name: sessionName,
          session_code: codeData,
          experts_count: parseInt(expertsCount),
          objects_count: parseInt(objectsCount),
          method: method,
          status: 'waiting',
          created_by: authData.user.id
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        toast.error("Ошибка при создании сессии");
        setIsCreating(false);
        return;
      }

      toast.success("Сессия создана успешно!");
      navigate(`/admin/session/${session.id}`);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error("Непредвиденная ошибка");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="max-w-3xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <Card className="p-8 shadow-card">
          <h1 className="text-3xl font-bold mb-2">Создание сессии</h1>
          <p className="text-muted-foreground mb-8">
            Настройте параметры голосования
          </p>

          <div className="space-y-6">
            <div>
              <Label htmlFor="sessionName">Название сессии</Label>
              <Input
                id="sessionName"
                placeholder="Например: Оценка проектов 2024"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="experts">Количество экспертов</Label>
                <Input
                  id="experts"
                  type="number"
                  min="2"
                  max="50"
                  value={expertsCount}
                  onChange={(e) => setExpertsCount(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="objects">Количество объектов</Label>
                <Input
                  id="objects"
                  type="number"
                  min="2"
                  max="20"
                  value={objectsCount}
                  onChange={(e) => setObjectsCount(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label className="mb-4 block">Метод оценки</Label>
              <RadioGroup value={method} onValueChange={setMethod} className="space-y-3">
                {methods.map((m) => (
                  <div key={m.id} className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value={m.id} id={m.id} className="mt-1" />
                    <Label htmlFor={m.id} className="cursor-pointer font-normal flex-1">
                      {m.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Button
              onClick={handleCreateSession}
              size="lg"
              className="w-full mt-8"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                "Создать сессию"
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminCreate;

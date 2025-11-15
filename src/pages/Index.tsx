import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, UserCog, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Вы вышли из системы");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="flex justify-end mb-4">
          {user ? (
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Выйти
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Войти
            </Button>
          )}
        </div>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Система Экспертного Голосования
          </h1>
          <p className="text-xl text-muted-foreground">
            Выберите роль для начала работы
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card 
            className="p-8 hover:shadow-card-hover transition-all duration-300 cursor-pointer group bg-gradient-card border-2"
            onClick={() => navigate('/admin/create')}
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCog className="w-10 h-10 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Администратор</h2>
                <p className="text-muted-foreground">
                  Создайте новую сессию голосования, настройте параметры и методы оценки
                </p>
              </div>
              <Button size="lg" className="w-full">
                Создать сессию
              </Button>
            </div>
          </Card>

          <Card 
            className="p-8 hover:shadow-card-hover transition-all duration-300 cursor-pointer group bg-gradient-card border-2"
            onClick={() => navigate('/join')}
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-10 h-10 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Эксперт</h2>
                <p className="text-muted-foreground">
                  Присоединитесь к существующей сессии по ссылке или QR-коду
                </p>
              </div>
              <Button size="lg" variant="outline" className="w-full">
                Присоединиться
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-lg font-semibold mb-4">Доступные методы оценки:</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Ранжирование',
              'Парное сравнение',
              'Непосредственная оценка',
              'Метод Черчмена-Акоффа'
            ].map((method) => (
              <span 
                key={method}
                className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

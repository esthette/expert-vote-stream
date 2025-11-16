import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Trophy } from "lucide-react";

interface Session {
  id: string;
  session_name: string;
  method: string;
  status: string;
}

interface VotingObject {
  id: string;
  object_name: string;
}

interface Expert {
  id: string;
  nickname: string;
  has_voted: boolean;
}

interface Vote {
  expert_id: string;
  object_id: string;
  vote_value: any;
}

interface ResultItem {
  object: VotingObject;
  score: number;
  rank: number;
}

const Results = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [objects, setObjects] = useState<VotingObject[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    const fetchData = async () => {
      try {
        // Fetch session
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;
        setSession(sessionData);

        // Fetch objects
        const { data: objectsData, error: objectsError } = await supabase
          .from('objects')
          .select('*')
          .eq('session_id', sessionId)
          .order('object_order', { ascending: true });

        if (objectsError) throw objectsError;
        setObjects(objectsData || []);

        // Fetch experts
        const { data: expertsData, error: expertsError } = await supabase
          .from('experts')
          .select('*')
          .eq('session_id', sessionId);

        if (expertsError) throw expertsError;
        setExperts(expertsData || []);

        // Fetch votes
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('*')
          .eq('session_id', sessionId);

        if (votesError) throw votesError;
        setVotes(votesData || []);

        // Calculate results based on method
        if (objectsData && votesData && sessionData) {
          calculateResults(sessionData.method, objectsData, votesData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error("Ошибка загрузки результатов");
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  const calculateResults = (method: string, objectsData: VotingObject[], votesData: Vote[]) => {
    const resultMap: Record<string, number> = {};

    objectsData.forEach(obj => {
      resultMap[obj.id] = 0;
    });

    if (method === 'ranking') {
      // Calculate average rank (lower is better)
      votesData.forEach(vote => {
        const rank = vote.vote_value.rank || 0;
        resultMap[vote.object_id] += rank;
      });
      
      // Average the ranks
      Object.keys(resultMap).forEach(objId => {
        const voteCount = votesData.filter(v => v.object_id === objId).length;
        if (voteCount > 0) {
          resultMap[objId] = resultMap[objId] / voteCount;
        }
      });
    } else if (method === 'direct') {
      // Calculate average score
      votesData.forEach(vote => {
        const score = vote.vote_value.score || 0;
        resultMap[vote.object_id] += score;
      });
      
      // Average the scores
      Object.keys(resultMap).forEach(objId => {
        const voteCount = votesData.filter(v => v.object_id === objId).length;
        if (voteCount > 0) {
          resultMap[objId] = resultMap[objId] / voteCount;
        }
      });
    } else if (method === 'pairwise') {
      // Sum up wins
      votesData.forEach(vote => {
        const wins = vote.vote_value.wins || 0;
        resultMap[vote.object_id] += wins;
      });
      
      // Average the wins
      Object.keys(resultMap).forEach(objId => {
        const voteCount = votesData.filter(v => v.object_id === objId).length;
        if (voteCount > 0) {
          resultMap[objId] = resultMap[objId] / voteCount;
        }
      });
    } else if (method === 'churchman') {
      // Sum normalized weights
      votesData.forEach(vote => {
        const weight = vote.vote_value.normalized_weight || 0;
        resultMap[vote.object_id] += weight;
      });
      
      // Average the weights
      Object.keys(resultMap).forEach(objId => {
        const voteCount = votesData.filter(v => v.object_id === objId).length;
        if (voteCount > 0) {
          resultMap[objId] = resultMap[objId] / voteCount;
        }
      });
    }

    // Create sorted results
    const sortedResults = objectsData
      .map(obj => ({
        object: obj,
        score: resultMap[obj.id] || 0,
        rank: 0
      }))
      .sort((a, b) => {
        // For ranking method, lower score is better
        if (method === 'ranking') {
          return a.score - b.score;
        }
        // For others, higher is better
        return b.score - a.score;
      })
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }));

    setResults(sortedResults);
  };

  const methodNames: Record<string, string> = {
    ranking: "Ранжирование с расчетом коэффициента конкордации",
    pairwise: "Парное сравнение",
    direct: "Непосредственная оценка",
    churchman: "Последовательное сравнение (метод Черчмена-Акоффа)"
  };

  const votedCount = experts.filter(e => e.has_voted).length;
  const totalExperts = experts.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  if (!session) return null;

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

        <Card className="p-8 shadow-card mb-6">
          <h1 className="text-3xl font-bold mb-2">{session.session_name}</h1>
          <p className="text-muted-foreground mb-4">{methodNames[session.method]}</p>
          
          <div className="flex gap-4 text-sm text-muted-foreground mb-6">
            <span>Проголосовало: {votedCount} из {totalExperts} экспертов</span>
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Результаты голосования
              </h2>
              
              {results.map((result, index) => (
                <Card 
                  key={result.object.id} 
                  className={`p-6 ${index === 0 ? 'border-2 border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`text-3xl font-bold ${index === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                        #{result.rank}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{result.object.object_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {session.method === 'ranking' && `Средний ранг: ${result.score.toFixed(2)}`}
                          {session.method === 'direct' && `Средняя оценка: ${result.score.toFixed(2)}/10`}
                          {session.method === 'pairwise' && `Среднее количество побед: ${result.score.toFixed(2)}`}
                          {session.method === 'churchman' && `Средний вес: ${(result.score * 100).toFixed(1)}%`}
                        </p>
                      </div>
                    </div>
                    {index === 0 && (
                      <Trophy className="w-8 h-8 text-yellow-500" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {results.length === 0 && (
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground">
                Пока нет результатов голосования
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6 shadow-card">
          <h2 className="text-xl font-semibold mb-4">Эксперты</h2>
          <div className="space-y-2">
            {experts.map(expert => (
              <div key={expert.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                <span>{expert.nickname}</span>
                <span className={`text-sm ${expert.has_voted ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {expert.has_voted ? '✓ Проголосовал' : 'Не проголосовал'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Results;

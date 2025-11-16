import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VotingObject {
  id: string;
  object_name: string;
  object_order: number;
}

interface DirectVotingProps {
  objects: VotingObject[];
  expertId: string;
  sessionId: string;
}

interface Comparison {
  object1: VotingObject;
  object2: VotingObject;
  winner: string | null;
}

export const PairwiseVoting = ({ objects, expertId, sessionId }: DirectVotingProps) => {
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    generateComparisons();
    checkExistingVotes();
  }, [objects]);

  const generateComparisons = () => {
    const pairs: Comparison[] = [];
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        pairs.push({
          object1: objects[i],
          object2: objects[j],
          winner: null
        });
      }
    }
    setComparisons(pairs);
  };

  const checkExistingVotes = async () => {
    const { data } = await supabase
      .from('votes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('expert_id', expertId);
    
    if (data && data.length > 0) {
      setHasVoted(true);
    }
  };

  const handleChoice = (winnerId: string) => {
    const newComparisons = [...comparisons];
    newComparisons[currentIndex].winner = winnerId;
    setComparisons(newComparisons);

    if (currentIndex < comparisons.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    // Check all comparisons made
    if (comparisons.some(c => c.winner === null)) {
      toast.error("Пожалуйста, сделайте все сравнения");
      return;
    }

    setIsSubmitting(true);
    try {
      // Delete existing votes
      await supabase
        .from('votes')
        .delete()
        .eq('session_id', sessionId)
        .eq('expert_id', expertId);

      // Calculate wins for each object
      const wins: Record<string, number> = {};
      objects.forEach(obj => wins[obj.id] = 0);

      comparisons.forEach(comp => {
        if (comp.winner) {
          wins[comp.winner] = (wins[comp.winner] || 0) + 1;
        }
      });

      // Create votes with comparison data
      const votes = objects.map(obj => ({
        session_id: sessionId,
        expert_id: expertId,
        object_id: obj.id,
        vote_value: { wins: wins[obj.id] || 0, total_comparisons: comparisons.length }
      }));

      const { error } = await supabase.from('votes').insert(votes);

      if (error) throw error;

      // Update expert has_voted status
      await supabase
        .from('experts')
        .update({ has_voted: true })
        .eq('id', expertId);

      toast.success("Ваш голос сохранён!");
      setHasVoted(true);
    } catch (error) {
      console.error('Error submitting votes:', error);
      toast.error("Ошибка сохранения голоса");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (comparisons.length === 0) return null;

  const current = comparisons[currentIndex];
  const progress = ((currentIndex + 1) / comparisons.length) * 100;
  const allCompleted = comparisons.every(c => c.winner !== null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Парное сравнение</h2>
        <p className="text-muted-foreground mb-4">
          Выберите более важный объект из каждой пары
        </p>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {comparisons.length}
          </span>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Button
            variant={current.winner === current.object1.id ? "default" : "outline"}
            className="h-auto py-8 text-lg"
            onClick={() => handleChoice(current.object1.id)}
            disabled={hasVoted}
          >
            {current.object1.object_name}
          </Button>
          <Button
            variant={current.winner === current.object2.id ? "default" : "outline"}
            className="h-auto py-8 text-lg"
            onClick={() => handleChoice(current.object2.id)}
            disabled={hasVoted}
          >
            {current.object2.object_name}
          </Button>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0 || hasVoted}
        >
          Назад
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!allCompleted || isSubmitting || hasVoted}
          className="flex-1"
          size="lg"
        >
          {isSubmitting ? "Сохранение..." : hasVoted ? "Голос сохранён" : "Отправить результаты"}
        </Button>
      </div>
    </div>
  );
};

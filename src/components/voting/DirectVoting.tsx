import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export const DirectVoting = ({ objects, expertId, sessionId }: DirectVotingProps) => {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    checkExistingVotes();
  }, []);

  const checkExistingVotes = async () => {
    const { data } = await supabase
      .from('votes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('expert_id', expertId);
    
    if (data && data.length > 0) {
      setHasVoted(true);
      const existingScores: Record<string, number> = {};
      data.forEach(vote => {
        existingScores[vote.object_id] = (vote.vote_value as any).score;
      });
      setScores(existingScores);
    }
  };

  const handleScoreChange = (objectId: string, value: string) => {
    const score = parseFloat(value);
    if (!isNaN(score) && score >= 0 && score <= 10) {
      setScores(prev => ({ ...prev, [objectId]: score }));
    } else if (value === '') {
      setScores(prev => {
        const newScores = { ...prev };
        delete newScores[objectId];
        return newScores;
      });
    }
  };

  const handleSubmit = async () => {
    // Check all objects have scores
    if (Object.keys(scores).length !== objects.length) {
      toast.error("Пожалуйста, оцените все объекты");
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

      // Create new votes with scores
      const votes = objects.map(obj => ({
        session_id: sessionId,
        expert_id: expertId,
        object_id: obj.id,
        vote_value: { score: scores[obj.id] || 0 }
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Непосредственная оценка</h2>
        <p className="text-muted-foreground mb-4">
          Оцените каждый объект по шкале от 0 до 10
        </p>
      </div>

      <div className="space-y-4">
        {objects.map((obj, index) => (
          <Card key={obj.id} className="p-4">
            <div className="flex items-center gap-4">
              <span className="font-medium text-lg w-8">{index + 1}.</span>
              <span className="text-lg flex-1">{obj.object_name}</span>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={scores[obj.id] ?? ''}
                onChange={(e) => handleScoreChange(obj.id, e.target.value)}
                className="w-24"
                placeholder="0-10"
                disabled={hasVoted}
              />
            </div>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || hasVoted}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? "Сохранение..." : hasVoted ? "Голос сохранён" : "Отправить оценки"}
      </Button>
    </div>
  );
};

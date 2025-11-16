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

interface ChurchmanVotingProps {
  objects: VotingObject[];
  expertId: string;
  sessionId: string;
}

export const ChurchmanVoting = ({ objects, expertId, sessionId }: ChurchmanVotingProps) => {
  const [weights, setWeights] = useState<Record<string, number>>({});
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
      const existingWeights: Record<string, number> = {};
      data.forEach(vote => {
        existingWeights[vote.object_id] = (vote.vote_value as any).weight;
      });
      setWeights(existingWeights);
    }
  };

  const handleWeightChange = (objectId: string, value: string) => {
    const weight = parseFloat(value);
    if (!isNaN(weight) && weight >= 0) {
      setWeights(prev => ({ ...prev, [objectId]: weight }));
    } else if (value === '') {
      setWeights(prev => {
        const newWeights = { ...prev };
        delete newWeights[objectId];
        return newWeights;
      });
    }
  };

  const getTotalWeight = () => {
    return Object.values(weights).reduce((sum, w) => sum + w, 0);
  };

  const handleSubmit = async () => {
    // Check all objects have weights
    if (Object.keys(weights).length !== objects.length) {
      toast.error("Пожалуйста, укажите веса для всех объектов");
      return;
    }

    const total = getTotalWeight();
    if (total === 0) {
      toast.error("Сумма весов должна быть больше нуля");
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

      // Normalize weights to sum to 1
      const normalizedWeights = Object.entries(weights).reduce((acc, [id, weight]) => {
        acc[id] = weight / total;
        return acc;
      }, {} as Record<string, number>);

      // Create new votes with weights
      const votes = objects.map(obj => ({
        session_id: sessionId,
        expert_id: expertId,
        object_id: obj.id,
        vote_value: { 
          weight: weights[obj.id] || 0,
          normalized_weight: normalizedWeights[obj.id]
        }
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

  const totalWeight = getTotalWeight();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Метод Черчмена-Акоффа</h2>
        <p className="text-muted-foreground mb-4">
          Присвойте каждому объекту вес (положительное число). Веса будут нормализованы относительно их суммы.
        </p>
      </div>

      <div className="space-y-4">
        {objects.map((obj, index) => (
          <Card key={obj.id} className="p-4">
            <div className="flex items-center gap-4">
              <span className="font-medium text-lg w-8">{index + 1}.</span>
              <span className="text-lg flex-1">{obj.object_name}</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={weights[obj.id] ?? ''}
                  onChange={(e) => handleWeightChange(obj.id, e.target.value)}
                  className="w-24"
                  placeholder="Вес"
                  disabled={hasVoted}
                />
                {weights[obj.id] !== undefined && totalWeight > 0 && (
                  <span className="text-sm text-muted-foreground w-16 text-right">
                    ({((weights[obj.id] / totalWeight) * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {totalWeight > 0 && (
        <Card className="p-4 bg-secondary/20">
          <div className="flex justify-between items-center">
            <span className="font-medium">Сумма весов:</span>
            <span className="text-lg font-bold">{totalWeight.toFixed(2)}</span>
          </div>
        </Card>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || hasVoted}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? "Сохранение..." : hasVoted ? "Голос сохранён" : "Отправить веса"}
      </Button>
    </div>
  );
};

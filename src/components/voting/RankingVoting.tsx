import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";

interface VotingObject {
  id: string;
  object_name: string;
  object_order: number;
}

interface RankingVotingProps {
  objects: VotingObject[];
  expertId: string;
  sessionId: string;
}

export const RankingVoting = ({ objects, expertId, sessionId }: RankingVotingProps) => {
  const [rankedObjects, setRankedObjects] = useState<VotingObject[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    setRankedObjects([...objects]);
    checkExistingVotes();
  }, [objects]);

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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newObjects = [...rankedObjects];
    const draggedItem = newObjects[draggedIndex];
    newObjects.splice(draggedIndex, 1);
    newObjects.splice(index, 0, draggedItem);
    
    setRankedObjects(newObjects);
    setDraggedIndex(index);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Delete existing votes
      await supabase
        .from('votes')
        .delete()
        .eq('session_id', sessionId)
        .eq('expert_id', expertId);

      // Create new votes with ranks
      const votes = rankedObjects.map((obj, index) => ({
        session_id: sessionId,
        expert_id: expertId,
        object_id: obj.id,
        vote_value: { rank: index + 1 }
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
        <h2 className="text-xl font-semibold mb-2">Ранжирование объектов</h2>
        <p className="text-muted-foreground mb-4">
          Перетащите объекты в порядке их важности (самый важный сверху)
        </p>
      </div>

      <div className="space-y-2">
        {rankedObjects.map((obj, index) => (
          <Card
            key={obj.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            className="p-4 cursor-move hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <GripVertical className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-lg w-8">{index + 1}</span>
              <span className="text-lg">{obj.object_name}</span>
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
        {isSubmitting ? "Сохранение..." : hasVoted ? "Голос сохранён" : "Отправить ранжирование"}
      </Button>
    </div>
  );
};

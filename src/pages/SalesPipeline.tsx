import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, TrendingUp, DollarSign, Target, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DealDialog } from "@/components/crm/DealDialog";
import { DealCard } from "@/components/crm/DealCard";

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  status: string;
  probability: number;
  close_date: string | null;
  contact_id: string | null;
  account_id: string | null;
  owner_id: string;
  notes: string | null;
  currency: string;
  created_at: string;
  contact?: { first_name: string; last_name: string };
  account?: { name: string };
}

interface Stage {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
}

const STAGES: Stage[] = [
  { id: "prospect", name: "Prospecção", color: "bg-slate-500", deals: [] },
  { id: "qualified", name: "Qualificado", color: "bg-blue-500", deals: [] },
  { id: "proposal", name: "Proposta", color: "bg-purple-500", deals: [] },
  { id: "negotiation", name: "Negociação", color: "bg-orange-500", deals: [] },
  { id: "closed_won", name: "Fechado (Ganho)", color: "bg-green-500", deals: [] },
  { id: "closed_lost", name: "Fechado (Perdido)", color: "bg-red-500", deals: [] },
];

export default function SalesPipeline() {
  const [stages, setStages] = useState<Stage[]>(STAGES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      const { data, error } = await supabase
        .from("crm_deals")
        .select(`
          *,
          contact:crm_contacts(first_name, last_name),
          account:crm_accounts(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const updatedStages = STAGES.map((stage) => ({
        ...stage,
        deals: (data || []).filter((deal) => deal.stage === stage.id),
      }));

      setStages(updatedStages);
    } catch (error) {
      console.error("Erro ao carregar deals:", error);
      toast({
        title: "Erro ao carregar oportunidades",
        description: "Não foi possível carregar as oportunidades",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceStage = stages.find((s) => s.id === source.droppableId);
    const destStage = stages.find((s) => s.id === destination.droppableId);

    if (!sourceStage || !destStage) return;

    const deal = sourceStage.deals[source.index];
    
    // Update local state immediately for smooth UX
    const newSourceDeals = Array.from(sourceStage.deals);
    newSourceDeals.splice(source.index, 1);
    
    const newDestDeals = Array.from(destStage.deals);
    newDestDeals.splice(destination.index, 0, { ...deal, stage: destStage.id });

    const newStages = stages.map((stage) => {
      if (stage.id === source.droppableId) {
        return { ...stage, deals: newSourceDeals };
      }
      if (stage.id === destination.droppableId) {
        return { ...stage, deals: newDestDeals };
      }
      return stage;
    });

    setStages(newStages);

    // Update in database
    try {
      const updateData: any = { stage: destStage.id };
      
      // Automatically update status based on stage
      if (destStage.id === "closed_won") {
        updateData.status = "won";
      } else if (destStage.id === "closed_lost") {
        updateData.status = "lost";
      } else {
        updateData.status = "open";
      }

      const { error } = await supabase
        .from("crm_deals")
        .update(updateData)
        .eq("id", draggableId);

      if (error) throw error;

      toast({
        title: "Oportunidade movida",
        description: `Movida para ${destStage.name}`,
      });
    } catch (error) {
      console.error("Erro ao atualizar deal:", error);
      toast({
        title: "Erro ao mover oportunidade",
        description: "Não foi possível atualizar a oportunidade",
        variant: "destructive",
      });
      // Revert on error
      loadDeals();
    }
  };

  const handleCreateDeal = (stageId: string) => {
    setSelectedDeal(null);
    setSelectedStage(stageId);
    setIsDialogOpen(true);
  };

  const handleEditDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setSelectedStage(deal.stage);
    setIsDialogOpen(true);
  };

  const handleDealSaved = () => {
    loadDeals();
    setIsDialogOpen(false);
    setSelectedDeal(null);
    setSelectedStage("");
  };

  // Calculate metrics
  const totalValue = stages
    .flatMap((s) => s.deals)
    .filter((d) => d.status === "open")
    .reduce((sum, deal) => sum + deal.value, 0);

  const weightedValue = stages
    .flatMap((s) => s.deals)
    .filter((d) => d.status === "open")
    .reduce((sum, deal) => sum + deal.value * (deal.probability / 100), 0);

  const totalDeals = stages.flatMap((s) => s.deals).filter((d) => d.status === "open").length;

  const wonDeals = stages
    .find((s) => s.id === "closed_won")
    ?.deals.filter((d) => {
      const closeDate = new Date(d.close_date || d.created_at);
      const now = new Date();
      return closeDate.getMonth() === now.getMonth() && closeDate.getFullYear() === now.getFullYear();
    }).length || 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Funil de Vendas</h1>
          <p className="text-muted-foreground">Gerencie suas oportunidades de vendas</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Em oportunidades abertas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Ponderado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {weightedValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Baseado em probabilidade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades Ativas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeals}</div>
            <p className="text-xs text-muted-foreground">No pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas no Mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wonDeals}</div>
            <p className="text-xs text-muted-foreground">Negócios fechados</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                  <h3 className="font-semibold text-foreground">{stage.name}</h3>
                  <Badge variant="secondary">{stage.deals.length}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCreateDeal(stage.id)}
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`bg-muted/30 rounded-lg p-3 min-h-[500px] space-y-3 transition-colors ${
                      snapshot.isDraggingOver ? "bg-muted/60" : ""
                    }`}
                  >
                    {stage.deals.map((deal, index) => (
                      <Draggable key={deal.id} draggableId={deal.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <DealCard
                              deal={deal}
                              onEdit={() => handleEditDeal(deal)}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Deal Dialog */}
      <DealDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        deal={selectedDeal}
        defaultStage={selectedStage}
        onSaved={handleDealSaved}
      />
    </div>
  );
}

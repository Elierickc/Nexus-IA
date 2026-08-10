import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle, Send, Plus, Bot, User, Phone, Megaphone,
  ShoppingCart, Loader2, RefreshCw, Users
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Conversation {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  status: string;
  ai_enabled: boolean;
  purchase_intent: boolean;
  crm_lead_id: string | null;
  last_message_at: string;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: string;
  content: string;
  message_type: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  message_template: string;
  target_phones: string[];
  status: string;
  sent_count: number;
  failed_count: number;
  total_count: number;
  created_at: string;
}

const WhatsAppAI = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [newConvPhone, setNewConvPhone] = useState("");
  const [newConvName, setNewConvName] = useState("");
  const [isNewConvOpen, setIsNewConvOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [campaignPhones, setCampaignPhones] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ["whatsapp-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!user,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ["whatsapp-messages", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", selectedConversation)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversation,
    refetchInterval: 5000,
  });

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ["whatsapp-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user,
  });

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel("whatsapp-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ phone, message, conversationId }: { phone: string; message: string; conversationId: string }) => {
      const { data, error } = await supabase.functions.invoke("zapi-send-message", {
        body: { phone, message, conversationId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", selectedConversation] });
    },
    onError: (err) => toast.error("Erro ao enviar: " + (err as Error).message),
  });

  // Create conversation
  const createConversation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .insert({
          user_id: user!.id,
          contact_phone: newConvPhone.replace(/\D/g, ''),
          contact_name: newConvName || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setIsNewConvOpen(false);
      setNewConvPhone("");
      setNewConvName("");
      setSelectedConversation(data.id);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      toast.success("Conversa criada!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });

  // Toggle AI
  const toggleAI = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ ai_enabled: enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
  });

  // Create campaign
  const createCampaign = useMutation({
    mutationFn: async () => {
      const phones = campaignPhones.split("\n").map(p => p.trim()).filter(Boolean);
      const { data, error } = await supabase
        .from("whatsapp_campaigns")
        .insert({
          user_id: user!.id,
          name: campaignName,
          message_template: campaignMessage,
          target_phones: phones,
          total_count: phones.length,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setIsCampaignOpen(false);
      setCampaignName("");
      setCampaignMessage("");
      setCampaignPhones("");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
      toast.success("Campanha criada!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });

  // Start campaign
  const startCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke("zapi-send-bulk", {
        body: { campaignId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
      toast.success("Campanha iniciada!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  const handleSend = () => {
    if (!messageInput.trim() || !selectedConv) return;
    sendMessage.mutate({
      phone: selectedConv.contact_phone,
      message: messageInput,
      conversationId: selectedConv.id,
    });
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">WhatsApp IA</h1>
          <p className="text-muted-foreground">Disparos, IA automática e integração com CRM</p>
        </div>
      </div>

      <Tabs defaultValue="conversations" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="conversations" className="gap-2">
            <MessageCircle className="w-4 h-4" />
            Conversas
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="w-4 h-4" />
            Disparos
          </TabsTrigger>
        </TabsList>

        {/* CONVERSATIONS TAB */}
        <TabsContent value="conversations" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[70vh]">
            {/* Conversation list */}
            <Card className="p-3 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Conversas</h3>
                <Dialog open={isNewConvOpen} onOpenChange={setIsNewConvOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="w-4 h-4" /></Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Conversa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Telefone (com DDD)</Label>
                        <Input placeholder="5511999999999" value={newConvPhone} onChange={e => setNewConvPhone(e.target.value)} />
                      </div>
                      <div>
                        <Label>Nome (opcional)</Label>
                        <Input placeholder="Nome do contato" value={newConvName} onChange={e => setNewConvName(e.target.value)} />
                      </div>
                      <Button onClick={() => createConversation.mutate()} disabled={!newConvPhone || createConversation.isPending}>
                        {createConversation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Criar Conversa
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-1">
                  {loadingConvs ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                  ) : conversations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa ainda</p>
                  ) : (
                    conversations.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedConversation === conv.id ? "bg-accent" : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">
                            {conv.contact_name || conv.contact_phone}
                          </span>
                          <div className="flex gap-1">
                            {conv.ai_enabled && <Badge variant="secondary" className="text-[10px] px-1"><Bot className="w-3 h-3" /></Badge>}
                            {conv.purchase_intent && <Badge variant="default" className="text-[10px] px-1"><ShoppingCart className="w-3 h-3" /></Badge>}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{conv.contact_phone}</p>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Chat area */}
            <Card className="md:col-span-2 flex flex-col overflow-hidden">
              {selectedConv ? (
                <>
                  {/* Chat header */}
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{selectedConv.contact_name || selectedConv.contact_phone}</p>
                        <p className="text-xs text-muted-foreground">{selectedConv.contact_phone}</p>
                      </div>
                      {selectedConv.purchase_intent && (
                        <Badge variant="default" className="text-[10px]">
                          <ShoppingCart className="w-3 h-3 mr-1" /> Interesse de Compra
                        </Badge>
                      )}
                      {selectedConv.crm_lead_id && (
                        <Badge variant="outline" className="text-[10px]">
                          <Users className="w-3 h-3 mr-1" /> No CRM
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="ai-toggle" className="text-xs">IA</Label>
                      <Switch
                        id="ai-toggle"
                        checked={selectedConv.ai_enabled}
                        onCheckedChange={(checked) => toggleAI.mutate({ id: selectedConv.id, enabled: checked })}
                      />
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {loadingMsgs ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                      ) : messages.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">Nenhuma mensagem ainda</p>
                      ) : (
                        messages.map(msg => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                                msg.direction === "outgoing"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {(msg.metadata as Record<string, unknown>)?.ai_generated && (
                                <div className="flex items-center gap-1 mb-1 opacity-70">
                                  <Bot className="w-3 h-3" />
                                  <span className="text-[10px]">IA</span>
                                </div>
                              )}
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                              <p className="text-[10px] opacity-60 mt-1 text-right">
                                {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-3 border-t flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    />
                    <Button onClick={handleSend} disabled={!messageInput.trim() || sendMessage.isPending}>
                      {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <MessageCircle className="w-12 h-12 mx-auto opacity-30" />
                    <p>Selecione uma conversa ou crie uma nova</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* CAMPAIGNS TAB */}
        <TabsContent value="campaigns" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Campanhas de Disparo</h3>
              <Dialog open={isCampaignOpen} onOpenChange={setIsCampaignOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Campanha</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Nova Campanha de Disparo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome da Campanha</Label>
                      <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ex: Promoção Janeiro" />
                    </div>
                    <div>
                      <Label>Mensagem</Label>
                      <Textarea value={campaignMessage} onChange={e => setCampaignMessage(e.target.value)} placeholder="Digite a mensagem que será enviada..." rows={4} />
                    </div>
                    <div>
                      <Label>Telefones (um por linha, com DDD)</Label>
                      <Textarea
                        value={campaignPhones}
                        onChange={e => setCampaignPhones(e.target.value)}
                        placeholder={"5511999999999\n5511888888888\n5521777777777"}
                        rows={5}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {campaignPhones.split("\n").filter(p => p.trim()).length} números
                      </p>
                    </div>
                    <Button
                      onClick={() => createCampaign.mutate()}
                      disabled={!campaignName || !campaignMessage || !campaignPhones || createCampaign.isPending}
                      className="w-full"
                    >
                      {createCampaign.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Criar Campanha
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {campaigns.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <Megaphone className="w-12 h-12 mx-auto opacity-30 mb-2" />
                  <p>Nenhuma campanha criada ainda</p>
                </Card>
              ) : (
                campaigns.map(camp => (
                  <Card key={camp.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{camp.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">{camp.message_template}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant={camp.status === "completed" ? "default" : camp.status === "sending" ? "secondary" : "outline"}>
                            {camp.status === "draft" ? "Rascunho" : camp.status === "sending" ? "Enviando..." : camp.status === "completed" ? "Concluída" : camp.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {camp.sent_count}/{camp.total_count} enviados
                            {camp.failed_count > 0 && ` · ${camp.failed_count} falhas`}
                          </span>
                        </div>
                      </div>
                      {camp.status === "draft" && (
                        <Button
                          size="sm"
                          onClick={() => startCampaign.mutate(camp.id)}
                          disabled={startCampaign.isPending}
                        >
                          {startCampaign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                          Enviar
                        </Button>
                      )}
                      {camp.status === "sending" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <RefreshCw className="w-4 h-4 animate-spin" /> Enviando...
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppAI;

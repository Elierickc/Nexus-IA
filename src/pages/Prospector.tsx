import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Phone, Globe, Building, Sparkles, Mail, Instagram, Loader2, Map, Filter, Calendar, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Lead {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  description: string;
  category: string;
  analise?: string;
}

export default function Prospector() {
  const { toast } = useToast();
  const { user, plan } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [savedLeads, setSavedLeads] = useState<any[]>([]);
  const [isProspecting, setIsProspecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLoadingSavedLeads, setIsLoadingSavedLeads] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterLocation, setFilterLocation] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDate, setFilterDate] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState("");
  const [maxResults, setMaxResults] = useState("10");
  const [generatingMessage, setGeneratingMessage] = useState<string | null>(null);
  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Empreendedor";

  useEffect(() => {
    if (user) {
      loadSavedLeads();
    }
  }, [user]);

  const loadSavedLeads = async () => {
    if (!user) return;
    
    setIsLoadingSavedLeads(true);
    try {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedLeads(data || []);
    } catch (error) {
      console.error("Error loading saved leads:", error);
    } finally {
      setIsLoadingSavedLeads(false);
    }
  };

  const handleIniciarProspeccao = async () => {
    if (!user) {
      toast({
        title: "Autenticação necessária",
        description: "Faça login para usar esta funcionalidade.",
        variant: "destructive",
      });
      return;
    }

    if (!searchQuery.trim()) {
      toast({
        title: "Digite uma busca",
        description: "Informe o que você deseja buscar (ex: restaurantes em São Paulo)",
        variant: "destructive",
      });
      return;
    }

    setIsProspecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("apify-prospect", {
        body: {
          query: searchQuery,
          maxResults: parseInt(maxResults) || 10,
        },
      });

      if (error) throw error;

      toast({
        title: "Prospecção concluída!",
        description: `${data.leads?.length || 0} leads encontrados e salvos.`,
      });

      // Reload saved leads
      await loadSavedLeads();
      setSearchQuery("");
    } catch (error: any) {
      console.error("Error prospecting:", error);
      toast({
        title: "Erro na prospecção",
        description: error.message || "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setIsProspecting(false);
    }
  };

  const getFilteredLeads = () => {
    return savedLeads.filter((lead) => {
      const matchesLocation = !filterLocation || 
        lead.address?.toLowerCase().includes(filterLocation.toLowerCase());
      
      const matchesCategory = !filterCategory || 
        lead.name?.toLowerCase().includes(filterCategory.toLowerCase()) ||
        lead.company?.toLowerCase().includes(filterCategory.toLowerCase());
      
      const matchesDate = !filterDate || 
        format(new Date(lead.created_at), "yyyy-MM-dd") === format(filterDate, "yyyy-MM-dd");

      return matchesLocation && matchesCategory && matchesDate;
    });
  };

  const clearFilters = () => {
    setFilterLocation("");
    setFilterCategory("");
    setFilterDate(undefined);
  };

  const generateWhatsAppMessage = async (lead: any) => {
    if (!user) {
      toast({
        title: "Autenticação necessária",
        description: "Faça login para usar esta funcionalidade.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingMessage(lead.id);
    try {
      const message = 'ola';

      // Format phone number for WhatsApp
      let phoneNumber = lead.phone?.replace(/\D/g, '') || '';
      if (phoneNumber && !phoneNumber.startsWith('55')) {
        phoneNumber = '55' + phoneNumber;
      }
      if (!phoneNumber) {
        toast({
          title: "Telefone não disponível",
          description: "Este lead não possui telefone cadastrado.",
          variant: "destructive",
        });
        return;
      }

      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      toast({
        title: "WhatsApp aberto!",
        description: "Link gerado no formato wa.me",
      });
    } catch (error) {
      console.error("Error generating message:", error);
      toast({
        title: "Erro ao gerar link",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setGeneratingMessage(null);
    }
  };

  const analisarLead = async (leadName: string) => {
    if (!user) {
      toast({
        title: "Autenticação necessária",
        description: "Faça login para usar esta funcionalidade.",
        variant: "destructive",
      });
      return;
    }

    // Check subscription
    if (!plan || (plan !== "pro" && plan !== "enterprise")) {
      toast({
        title: "Assinatura necessária",
        description: "Você precisa de uma assinatura para usar esta funcionalidade.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(leadName);
    try {
      const lead = leads.find((l) => l.name === leadName);
      if (!lead) return;

      const { data, error } = await supabase.functions.invoke("suggest-features", {
        body: {
          projectDescription: `Criar um aplicativo personalizado para ${lead.name}, uma empresa de ${lead.category}. ${lead.description}`,
        },
      });

      if (error) throw error;

      const analiseIA = `
🎯 **Análise de Oportunidade - ${lead.name}**

**Sobre o Negócio:**
${lead.description}

**Desafios Identificados:**
Empresas de ${lead.category} frequentemente enfrentam desafios com gestão de clientes, agendamentos e presença digital limitada.

**Recursos Sugeridos pela IA:**
${data.suggestions?.map((s: any, i: number) => `${i + 1}. **${s.title}**: ${s.description}`).join('\n')}

**Próximos Passos:**
1. Agendar demonstração personalizada
2. Apresentar case de sucesso similar
3. Propor teste gratuito de 14 dias
      `.trim();

      // Update lead in state
      setLeads(
        leads.map((lead) =>
          lead.name === leadName ? { ...lead, analise: analiseIA } : lead
        )
      );

      // Update lead in database
      await supabase
        .from("crm_leads")
        .update({ notes: analiseIA })
        .eq("owner_id", user.id)
        .eq("name", leadName);

      toast({
        title: "Análise concluída!",
        description: "Insights e oportunidades identificados pela IA",
      });
    } catch (error) {
      console.error("Error analyzing lead:", error);
      toast({
        title: "Erro na análise",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(null);
    }
  };

  const filteredLeads = getFilteredLeads();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">
          Boa noite, <span className="gradient-text">{userName}!</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Encontre seus próximos clientes com inteligência artificial
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Buscar Empresas
          </CardTitle>
          <CardDescription>
            Use a API do Apify para encontrar empresas automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search-query">O que você está buscando?</Label>
            <Input
              id="search-query"
              placeholder="Ex: restaurantes em São Paulo, clínicas em Curitiba..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-muted border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-results">Máximo de resultados</Label>
            <Input
              id="max-results"
              type="number"
              min="1"
              max="50"
              value={maxResults}
              onChange={(e) => setMaxResults(e.target.value)}
              className="bg-muted border-border"
            />
          </div>
          <Button
            size="lg"
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleIniciarProspeccao}
            disabled={isProspecting || !user}
          >
            {isProspecting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Prospectando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" />
                Iniciar Prospecção
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {user && savedLeads.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Leads Salvos ({filteredLeads.length})
                </CardTitle>
                <CardDescription>Gerencie seus leads prospectados</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? "Ocultar Filtros" : "Filtrar"}
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="border-t border-border pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Localização</Label>
                  <Input
                    placeholder="Filtrar por endereço..."
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria/Nome</Label>
                  <Input
                    placeholder="Filtrar por nome..."
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-muted border-border",
                          !filterDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {filterDate ? format(filterDate, "PPP") : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filterDate}
                        onSelect={setFilterDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          )}
          <CardContent className={showFilters ? "pt-0" : ""}>
            {isLoadingSavedLeads ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum lead encontrado com os filtros aplicados
              </p>
            ) : (
              <div className="space-y-4">
                {filteredLeads.map((lead, index) => (
                  <Card key={lead.id} className="bg-muted/30 border-border">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                           <div className="p-2 rounded-lg bg-primary/20">
                            <Building className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{lead.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Salvo em {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                            {lead.status && (
                              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                                {lead.status === 'new' ? 'Novo' : lead.status}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {lead.phone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                {lead.phone}
                              </div>
                            )}
                            {lead.email && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                {lead.email}
                              </div>
                            )}
                            {lead.company && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Building className="h-4 w-4" />
                                {lead.company}
                              </div>
                            )}
                            {lead.source && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Sparkles className="h-4 w-4" />
                                Fonte: {lead.source}
                              </div>
                            )}
                          </div>
                          {lead.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/30"
                              onClick={() => generateWhatsAppMessage(lead)}
                              disabled={generatingMessage === lead.id}
                            >
                              {generatingMessage === lead.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Gerando mensagem...
                                </>
                              ) : (
                                <>
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Enviar mensagem no WhatsApp
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        {lead.ai_analysis && (
                          <div className="mt-4 p-4 bg-background/50 rounded-lg border border-border">
                            <p className="text-xs font-semibold text-primary mb-2">Análise IA:</p>
                            <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                              {lead.ai_analysis}
                            </pre>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {leads.length > 0 && (
        <div className="space-y-6">
          {leads.map((lead, index) => (
            <div key={index} className="flex gap-4">
              <div className="step-number">{index + 1}</div>
              <Card className="glass-card flex-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-primary/20">
                        <Building className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{lead.name}</CardTitle>
                        <CardDescription className="text-base">{lead.category}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {lead.phone}
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {lead.email}
                      </div>
                    )}
                    {lead.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        {lead.website}
                      </div>
                    )}
                    {lead.instagram && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Instagram className="h-4 w-4" />
                        {lead.instagram}
                      </div>
                    )}
                    {lead.address && (
                      <div className="flex items-center gap-2 text-muted-foreground md:col-span-2">
                        <MapPin className="h-4 w-4" />
                        {lead.address}
                      </div>
                    )}
                  </div>

                  {lead.description && (
                    <p className="text-sm text-muted-foreground pt-2">{lead.description}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const query = encodeURIComponent(`${lead.name} ${lead.address}`);
                        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                      }}
                    >
                      <Map className="mr-2 h-4 w-4" />
                      Ver no Google Maps
                    </Button>
                    {!lead.analise && (
                      <Button
                        className="flex-1 bg-primary hover:bg-primary/90"
                        onClick={() => analisarLead(lead.name)}
                        disabled={isAnalyzing === lead.name}
                      >
                        {isAnalyzing === lead.name ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analisando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Analisar com IA
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {lead.analise && (
                    <div className="mt-4 p-5 bg-muted/50 rounded-lg border border-border">
                      <pre className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                        {lead.analise}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

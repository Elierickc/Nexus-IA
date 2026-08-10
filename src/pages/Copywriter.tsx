import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Copy, Wand2, Building2, UserCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";

type ViewType = "contract" | "business" | "influencer";

export default function Copywriter() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>("contract");
  const [generatedText, setGeneratedText] = useState("");
  
  // Contract form data
  const [contractData, setContractData] = useState({
    projectName: "",
    providerName: "",
    providerDoc: "",
    clientName: "",
    clientDoc: "",
    serviceType: "",
    paymentTerms: "",
    deliveryTime: "",
    scopeDetails: "",
    city: "",
    includeMaintenanceFee: false,
  });

  // Prospecting form data
  const [formData, setFormData] = useState({
    nomeProjeto: "",
    empresaAlvo: "",
    contato: "",
    pontoConexao: "",
    desafioNicho: "",
    promessaValor: "",
    beneficioFinal: "",
    chamadaAcao: "",
  });

  const gerarContrato = async () => {
    const today = new Date().toLocaleDateString('pt-BR');
    const maintenanceClause = contractData.includeMaintenanceFee 
      ? "\n\nCLÁUSULA DE MANUTENÇÃO: O CONTRATANTE concorda em pagar uma taxa mensal de manutenção conforme acordado entre as partes."
      : "";

    const texto = `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Por este instrumento particular de Contrato de Prestação de Serviços, de um lado:

CONTRATADA: ${contractData.providerName}, ${contractData.providerDoc}, doravante denominado CONTRATADA;

CONTRATANTE: ${contractData.clientName}, ${contractData.clientDoc}, doravante denominado CONTRATANTE;

Têm entre si justo e acordado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas seguintes:

CLÁUSULA PRIMEIRA – DO OBJETO
O presente contrato tem como objeto a prestação de serviços de ${contractData.serviceType} denominado "${contractData.projectName}".

CLÁUSULA SEGUNDA – DO PRAZO
O prazo para entrega dos serviços será de ${contractData.deliveryTime}.

CLÁUSULA TERCEIRA – DO VALOR E CONDIÇÕES DE PAGAMENTO
${contractData.paymentTerms}

CLÁUSULA QUARTA – DO ESCOPO
${contractData.scopeDetails}${maintenanceClause}

CLÁUSULA QUINTA – DAS DISPOSIÇÕES GERAIS
As partes elegem o foro da comarca de ${contractData.city} para dirimir quaisquer questões oriundas do presente contrato.

${contractData.city}, ${today}

_________________________              _________________________
CONTRATADA                            CONTRATANTE
${contractData.providerName}          ${contractData.clientName}
    `.trim();

    setGeneratedText(texto);

    if (user) {
      await supabase.from("copy_texts").insert({
        user_id: user.id,
        title: `Contrato - ${contractData.projectName}`,
        content: texto,
        type: "contrato",
      });
    }

    toast({
      title: "Contrato gerado!",
      description: "Contrato pronto para revisão e assinatura",
    });
  };

  const gerarAbordagem = async () => {
    const texto = `
Olá, ${formData.contato}!

${formData.pontoConexao}

Percebi que ${formData.empresaAlvo} enfrenta ${formData.desafioNicho}.

Por isso, desenvolvi ${formData.nomeProjeto} - ${formData.promessaValor}

Com nossa solução, você vai ${formData.beneficioFinal}

${formData.chamadaAcao}

Que tal agendarmos uma conversa rápida de 15 minutos para eu te mostrar como isso funciona na prática?

Aguardo seu retorno!
    `.trim();

    setGeneratedText(texto);

    if (user) {
      await supabase.from("copy_texts").insert({
        user_id: user.id,
        title: `Abordagem para ${formData.empresaAlvo}`,
        content: texto,
        type: "prospecção",
      });
    }

    toast({
      title: "Abordagem gerada!",
      description: "Texto pronto para ser personalizado e enviado",
    });
  };

  const copiarTexto = () => {
    navigator.clipboard.writeText(generatedText);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência",
    });
  };

  const menuItems = [
    { id: "contract" as ViewType, label: "Gerar Contrato", icon: FileText },
    { id: "business" as ViewType, label: "Abordagem Empresas", icon: Building2 },
    { id: "influencer" as ViewType, label: "Abordagem Influencers", icon: UserCircle },
  ];

  const renderContractForm = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label htmlFor="projectName">Qual o nome do projeto ou serviço principal?</Label>
        <Input
          id="projectName"
          placeholder="Ex: Desenvolvimento do SaaS 'TaskFlow Pro'"
          value={contractData.projectName}
          onChange={(e) => setContractData({ ...contractData, projectName: e.target.value })}
          className="bg-background/50 border-border"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Label htmlFor="providerName">Seu nome ou da sua empresa</Label>
          <Input
            id="providerName"
            placeholder="Ex: João Silva ME"
            value={contractData.providerName}
            onChange={(e) => setContractData({ ...contractData, providerName: e.target.value })}
            className="bg-background/50 border-border"
          />
        </div>
        <div className="space-y-4">
          <Label htmlFor="providerDoc">Seu CPF ou CNPJ</Label>
          <Input
            id="providerDoc"
            placeholder="Ex: 12.345.678/0001-90"
            value={contractData.providerDoc}
            onChange={(e) => setContractData({ ...contractData, providerDoc: e.target.value })}
            className="bg-background/50 border-border"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Label htmlFor="clientName">Nome do cliente/empresa</Label>
          <Input
            id="clientName"
            placeholder="Ex: Acme Inc."
            value={contractData.clientName}
            onChange={(e) => setContractData({ ...contractData, clientName: e.target.value })}
            className="bg-background/50 border-border"
          />
        </div>
        <div className="space-y-4">
          <Label htmlFor="clientDoc">CPF ou CNPJ do cliente</Label>
          <Input
            id="clientDoc"
            placeholder="Ex: 98.765.432/0001-10"
            value={contractData.clientDoc}
            onChange={(e) => setContractData({ ...contractData, clientDoc: e.target.value })}
            className="bg-background/50 border-border"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label htmlFor="serviceType">Tipo de serviço</Label>
        <Input
          id="serviceType"
          placeholder="Desenvolvimento de Software como Serviço (SaaS)"
          value={contractData.serviceType}
          onChange={(e) => setContractData({ ...contractData, serviceType: e.target.value })}
          className="bg-background/50 border-border"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Label htmlFor="paymentTerms">Valor e Condições de pagamento</Label>
          <Input
            id="paymentTerms"
            placeholder="R$ 5.000,00, a ser pago 50% adiantado e 50% na entrega."
            value={contractData.paymentTerms}
            onChange={(e) => setContractData({ ...contractData, paymentTerms: e.target.value })}
            className="bg-background/50 border-border"
          />
        </div>
        <div className="space-y-4">
          <Label htmlFor="deliveryTime">Prazo de entrega</Label>
          <Input
            id="deliveryTime"
            placeholder="30 dias úteis"
            value={contractData.deliveryTime}
            onChange={(e) => setContractData({ ...contractData, deliveryTime: e.target.value })}
            className="bg-background/50 border-border"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label htmlFor="scopeDetails">Escopo detalhado e cláusulas adicionais (Opcional)</Label>
        <Textarea
          id="scopeDetails"
          placeholder="Descreva o escopo, entregáveis, etc."
          value={contractData.scopeDetails}
          onChange={(e) => setContractData({ ...contractData, scopeDetails: e.target.value })}
          className="min-h-32 bg-background/50 border-border"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="maintenanceFee"
          checked={contractData.includeMaintenanceFee}
          onCheckedChange={(checked) => 
            setContractData({ ...contractData, includeMaintenanceFee: checked as boolean })
          }
        />
        <Label htmlFor="maintenanceFee" className="cursor-pointer">
          Deseja incluir taxa de manutenção mensal?
        </Label>
      </div>

      <div className="space-y-4">
        <Label htmlFor="city">Sua cidade (para a data)</Label>
        <Input
          id="city"
          placeholder="Ex: São Paulo"
          value={contractData.city}
          onChange={(e) => setContractData({ ...contractData, city: e.target.value })}
          className="bg-background/50 border-border"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={gerarContrato} size="lg" className="px-12">
          <Wand2 className="mr-2 h-5 w-5" />
          Gerar Contrato
        </Button>
      </div>
    </div>
  );

  const renderProspectingForm = () => (
    <div className="space-y-6">
      {[
        { step: 1, label: "Nome do Projeto", id: "nomeProjeto", placeholder: "Ex: TaskMaster Pro" },
        { step: 2, label: "Empresa Alvo", id: "empresaAlvo", placeholder: "Ex: Clínica Saúde Total" },
        { step: 3, label: "Nome do Contato", id: "contato", placeholder: "Ex: Dr. João Silva" },
      ].map((field) => (
        <div key={field.step} className="space-y-3">
          <Label htmlFor={field.id} className="text-base font-semibold">
            {field.label}
          </Label>
          <Input
            id={field.id}
            placeholder={field.placeholder}
            value={formData[field.id as keyof typeof formData]}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            className="bg-background/50 border-border"
          />
        </div>
      ))}

      {[
        { step: 4, label: "Ponto de Conexão", id: "pontoConexao", placeholder: "Ex: Vi que sua clínica tem crescido muito...", hint: "💡 Como você conheceu ou por que está entrando em contato" },
        { step: 5, label: "Desafio do Nicho", id: "desafioNicho", placeholder: "Ex: dificuldades com agendamento de consultas...", hint: "🎯 Qual problema específico eles enfrentam" },
        { step: 6, label: "Promessa de Valor", id: "promessaValor", placeholder: "Ex: uma plataforma que automatiza agendamentos...", hint: "✨ O que sua solução faz de especial" },
        { step: 7, label: "Benefício Final", id: "beneficioFinal", placeholder: "Ex: economizar 10 horas por semana...", hint: "🚀 Resultado concreto que eles vão obter" },
      ].map((field) => (
        <div key={field.step} className="space-y-3">
          <Label htmlFor={field.id} className="text-base font-semibold">
            {field.label}
          </Label>
          <p className="text-sm text-muted-foreground">{field.hint}</p>
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={formData[field.id as keyof typeof formData]}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            className="min-h-24 bg-background/50 border-border"
          />
        </div>
      ))}

      <div className="space-y-3">
        <Label htmlFor="chamadaAcao" className="text-base font-semibold">
          Chamada para Ação
        </Label>
        <Input
          id="chamadaAcao"
          placeholder="Ex: Vamos marcar uma demonstração?"
          value={formData.chamadaAcao}
          onChange={(e) => setFormData({ ...formData, chamadaAcao: e.target.value })}
          className="bg-background/50 border-border"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={gerarAbordagem} size="lg" className="px-12">
          <Wand2 className="mr-2 h-5 w-5" />
          Gerar Abordagem
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <FileText className="h-8 w-8 text-primary" />
          IA Copywriter
        </h1>
        <p className="text-muted-foreground">
          Crie textos e documentos inteligentes para seus projetos.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
        <Card className="h-fit">
          <CardContent className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  setCurrentView(item.id);
                  setGeneratedText("");
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>
                {currentView === "contract" && "Gerar Contrato"}
                {currentView === "business" && "Abordagem Empresas"}
                {currentView === "influencer" && "Abordagem Influencers"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {currentView === "contract" && "Preencha os dados para criar um rascunho do contrato de prestação de serviços."}
                {currentView === "business" && "Preencha os dados para criar uma abordagem para empresas."}
                {currentView === "influencer" && "Preencha os dados para criar uma abordagem para influenciadores."}
              </p>
            </CardHeader>
            <CardContent>
              {currentView === "contract" && renderContractForm()}
              {(currentView === "business" || currentView === "influencer") && renderProspectingForm()}
            </CardContent>
          </Card>

          <Card className="lg:sticky lg:top-6 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Texto Gerado
                </span>
                {generatedText && (
                  <Button size="sm" variant="outline" onClick={copiarTexto}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedText ? (
                <div className="bg-muted/50 p-6 rounded-lg border border-border min-h-96 max-h-[600px] overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap leading-relaxed">{generatedText}</pre>
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-96 text-muted-foreground text-center p-8">
                  Preencha o formulário e clique no botão para gerar seu texto personalizado
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

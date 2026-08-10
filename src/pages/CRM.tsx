import { useState } from "react";
import { Plus, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContactList from "@/components/crm/ContactList";
import ContactForm from "@/components/crm/ContactForm";
import LeadList from "@/components/crm/LeadList";
import ConvertLeadDialog from "@/components/crm/ConvertLeadDialog";

const CRM = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("contacts");

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingContact(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleEdit = (contactId: string) => {
    setEditingContact(contactId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingContact(null);
  };

  const handleConvertLead = (leadId: string) => {
    setConvertingLeadId(leadId);
    setIsConvertDialogOpen(true);
  };

  const handleConvertSuccess = () => {
    setIsConvertDialogOpen(false);
    setConvertingLeadId(null);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">CRM</h1>
          <p className="text-muted-foreground">Gerencie seus leads, contatos e relacionamentos comerciais</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2" onClick={() => setEditingContact(null)}>
              <Plus className="w-5 h-5" />
              Novo Contato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingContact ? "Editar Contato" : "Novo Contato"}
              </DialogTitle>
            </DialogHeader>
            <ContactForm
              contactId={editingContact}
              onSuccess={handleSuccess}
              onCancel={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="leads" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="w-4 h-4" />
            Contatos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-6">
          <Card className="p-6">
            <LeadList
              key={refreshKey}
              onConvert={handleConvertLead}
              onEdit={(leadId) => {
                // TODO: Implement lead editing
                console.log("Edit lead:", leadId);
              }}
              onDelete={() => setRefreshKey(prev => prev + 1)}
            />
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <Card className="p-6">
            <ContactList
              key={refreshKey}
              onEdit={handleEdit}
              onDelete={() => setRefreshKey(prev => prev + 1)}
            />
          </Card>
        </TabsContent>
      </Tabs>

      <ConvertLeadDialog
        leadId={convertingLeadId}
        isOpen={isConvertDialogOpen}
        onClose={() => {
          setIsConvertDialogOpen(false);
          setConvertingLeadId(null);
        }}
        onSuccess={handleConvertSuccess}
      />
    </div>
  );
};

export default CRM;

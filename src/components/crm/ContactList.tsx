import { useEffect, useState } from "react";
import { Edit, Mail, Phone, Trash2, Building2, Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { openWhatsAppLink } from "@/lib/whatsapp";

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  emails: Email[];
  phones: Phone[];
  position: string | null;
  tags: string[] | null;
  account_id: string | null;
  crm_accounts?: {
    name: string;
  } | null;
}

interface Email {
  email: string;
  primary: boolean;
}

interface Phone {
  number: string;
  type: string;
}

interface ContactListProps {
  onEdit: (contactId: string) => void;
  onDelete: () => void;
}

const ContactList = ({ onEdit, onDelete }: ContactListProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  useEffect(() => {
    loadContacts();
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("crm_contacts")
      .select(`
        *,
        crm_accounts (
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar contatos: " + error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setContacts((data || []).map(contact => ({
      ...contact,
      emails: (contact.emails || []) as unknown as Email[],
      phones: (contact.phones || []) as unknown as Phone[],
    })));
    setIsLoading(false);
  };

  const generateWhatsAppMessage = (contact: Contact) => {
    const phone = getPrimaryPhone(contact.phones);
    if (!phone) {
      toast({
        title: "Erro",
        description: "Contato não possui telefone cadastrado",
        variant: "destructive",
      });
      return;
    }

    const message = 'ola';
    openWhatsAppLink(phone, message);

    toast({
      title: "Abrindo WhatsApp...",
      description: "Link gerado no formato wa.me",
    });
  };

  const handleDelete = async () => {
    if (!deleteContactId) return;

    const { error } = await supabase
      .from("crm_contacts")
      .delete()
      .eq("id", deleteContactId);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao deletar contato: " + error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Contato deletado com sucesso",
    });

    setDeleteContactId(null);
    loadContacts();
    onDelete();
  };

  const filteredContacts = contacts.filter((contact) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${contact.first_name} ${contact.last_name || ""}`.toLowerCase();
    const primaryEmail = contact.emails?.[0]?.email?.toLowerCase() || "";
    const company = contact.crm_accounts?.name?.toLowerCase() || "";
    
    return (
      fullName.includes(searchLower) ||
      primaryEmail.includes(searchLower) ||
      company.includes(searchLower)
    );
  });

  const getInitials = (firstName: string, lastName: string | null) => {
    return `${firstName.charAt(0)}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const getPrimaryEmail = (emails: Email[]) => {
    const primary = emails?.find(e => e.primary);
    return primary?.email || emails?.[0]?.email || "";
  };

  const getPrimaryPhone = (phones: Phone[]) => {
    return phones?.[0]?.number || "";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredContacts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm ? "Nenhum contato encontrado com esse termo" : "Nenhum contato cadastrado ainda"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
            >
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(contact.first_name, contact.last_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg truncate">
                    {contact.first_name} {contact.last_name}
                  </h3>
                  {contact.position && (
                    <span className="text-sm text-muted-foreground">• {contact.position}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {getPrimaryEmail(contact.emails) && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{getPrimaryEmail(contact.emails)}</span>
                    </div>
                  )}
                  
                  {getPrimaryPhone(contact.phones) && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{getPrimaryPhone(contact.phones)}</span>
                    </div>
                  )}

                  {contact.crm_accounts && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      <span className="truncate">{contact.crm_accounts.name}</span>
                    </div>
                  )}
                </div>

                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {contact.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => generateWhatsAppMessage(contact)}
                  title="Enviar mensagem no WhatsApp"
                  disabled={!getPrimaryPhone(contact.phones)}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(contact.id)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteContactId(contact.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteContactId} onOpenChange={() => setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContactList;

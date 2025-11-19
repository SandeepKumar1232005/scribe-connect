import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty").max(1000, "Message too long"),
});

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface ChatInterfaceProps {
  assignmentId: string;
  currentUser: User | null;
}

const ChatInterface = ({ assignmentId, currentUser }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [assignmentDetails, setAssignmentDetails] = useState<any>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!assignmentId || !currentUser) return;

    const fetchData = async () => {
      // Fetch assignment details
      const { data: assignment } = await supabase
        .from("assignments")
        .select(
          `
          *,
          provider_profiles!assignments_provider_id_fkey(
            user_id,
            profiles!provider_profiles_user_id_fkey(full_name)
          ),
          profiles!assignments_customer_id_fkey(full_name)
        `
        )
        .eq("id", assignmentId)
        .single();

      if (assignment) {
        setAssignmentDetails(assignment);
        // Determine the other user
        const isCustomer = assignment.customer_id === currentUser.id;
        const otherId = isCustomer ? assignment.provider_profiles.user_id : assignment.customer_id;
        setOtherUserId(otherId);
      }

      // Fetch messages
      await fetchMessages();
      
      // Mark messages as read
      await markMessagesAsRead();
    };

    fetchData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`messages:${assignmentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `assignment_id=eq.${assignmentId}`,
        },
        (payload) => {
          fetchMessages();
          if (payload.new.sender_id !== currentUser.id) {
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assignmentId, currentUser]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(full_name, avatar_url)
        `
        )
        .eq("assignment_id", assignmentId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!currentUser) return;

    try {
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("assignment_id", assignmentId)
        .eq("receiver_id", currentUser.id)
        .eq("read", false);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !otherUserId) return;

    try {
      const validated = messageSchema.parse({ content: newMessage });
      setSending(true);

      const { error } = await supabase.from("messages").insert({
        assignment_id: assignmentId,
        sender_id: currentUser.id,
        receiver_id: otherUserId,
        content: validated.content,
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-medium h-[calc(100vh-16rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="shadow-medium h-[calc(100vh-16rem)] flex flex-col">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg">{assignmentDetails?.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === currentUser?.id;
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.sender.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm">
                      {message.sender.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} max-w-[70%]`}>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="border-t border-border p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" disabled={sending || !newMessage.trim()} size="icon">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChatInterface;

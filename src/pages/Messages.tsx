import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Loader2 } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";

interface Conversation {
  assignment_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  assignment_title: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get("assignment")
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await fetchConversations(session.user.id);
    };

    checkAuth();
  }, [navigate]);

  const fetchConversations = async (userId: string) => {
    try {
      // Get all assignments where user is involved
      const { data: assignments } = await supabase
        .from("assignments")
        .select(
          `
          id,
          title,
          customer_id,
          provider_id,
          provider_profiles!assignments_provider_id_fkey(
            user_id,
            profiles!provider_profiles_user_id_fkey(full_name, avatar_url)
          ),
          profiles!assignments_customer_id_fkey(full_name, avatar_url)
        `
        )
        .or(`customer_id.eq.${userId},provider_profiles.user_id.eq.${userId}`);

      if (!assignments) {
        setLoading(false);
        return;
      }

      // For each assignment, get last message and unread count
      const conversationsData = await Promise.all(
        assignments.map(async (assignment: any) => {
          const isCustomer = assignment.customer_id === userId;
          const otherUserId = isCustomer
            ? assignment.provider_profiles.user_id
            : assignment.customer_id;
          const otherUserName = isCustomer
            ? assignment.provider_profiles.profiles.full_name
            : assignment.profiles.full_name;
          const otherUserAvatar = isCustomer
            ? assignment.provider_profiles.profiles.avatar_url
            : assignment.profiles.avatar_url;

          // Get last message
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("assignment_id", assignment.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("assignment_id", assignment.id)
            .eq("receiver_id", userId)
            .eq("read", false);

          return {
            assignment_id: assignment.id,
            other_user_id: otherUserId,
            other_user_name: otherUserName,
            other_user_avatar: otherUserAvatar,
            assignment_title: assignment.title,
            last_message: lastMessage?.content || "No messages yet",
            last_message_time: lastMessage?.created_at || new Date().toISOString(),
            unread_count: unreadCount || 0,
          };
        })
      );

      // Sort by last message time
      conversationsData.sort(
        (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      );

      setConversations(conversationsData);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (assignmentId: string) => {
    setSelectedConversation(assignmentId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Messages</h1>
          <p className="text-muted-foreground">Communicate with providers and customers</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="shadow-medium lg:col-span-1">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>Your active chats</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                {conversations.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No conversations yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.assignment_id}
                        onClick={() => handleConversationClick(conversation.assignment_id)}
                        className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                          selectedConversation === conversation.assignment_id ? "bg-muted" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={conversation.other_user_avatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                              {conversation.other_user_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold truncate">{conversation.other_user_name}</p>
                              {conversation.unread_count > 0 && (
                                <Badge className="ml-2">{conversation.unread_count}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-1 truncate">
                              {conversation.assignment_title}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">{conversation.last_message}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <ChatInterface assignmentId={selectedConversation} currentUser={user} />
            ) : (
              <Card className="shadow-medium h-[calc(100vh-16rem)] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;

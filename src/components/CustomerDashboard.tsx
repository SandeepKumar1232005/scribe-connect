import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, User as UserIcon } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  provider_profiles: {
    user_id: string;
    profiles: {
      full_name: string;
    };
  };
}

const CustomerDashboard = ({ user }: { user: User | null }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("assignments")
        .select(
          `
          *,
          provider_profiles!assignments_provider_id_fkey(
            user_id,
            profiles!provider_profiles_user_id_fkey(full_name)
          )
        `
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setAssignments(data);
      }
      setLoading(false);
    };

    fetchAssignments();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground";
      case "in_progress":
        return "bg-primary text-primary-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Customer Dashboard</h1>
        <p className="text-muted-foreground">Manage your assignments and find providers</p>
      </div>

      <div className="grid gap-6 mb-8">
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with your next assignment</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button asChild>
              <Link to="/browse">Browse Providers</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/browse">Find by Style</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Your Assignments</CardTitle>
          <CardDescription>Track and manage your active assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">You don't have any assignments yet</p>
              <Button asChild>
                <Link to="/browse">Find a Provider</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="border border-border rounded-lg p-4 hover:shadow-soft transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{assignment.title}</h3>
                    <Badge className={getStatusColor(assignment.status)}>{assignment.status}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{assignment.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <UserIcon className="h-4 w-4" />
                        <span>{assignment.provider_profiles.profiles.full_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(assignment.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/messages?assignment=${assignment.id}`}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Chat
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDashboard;

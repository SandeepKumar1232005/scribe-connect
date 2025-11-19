import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Briefcase, DollarSign, TrendingUp } from "lucide-react";

interface ProviderProfile {
  average_rating: number;
  total_reviews: number;
  hourly_rate: number;
  verified: boolean;
}

interface Assignment {
  id: string;
  title: string;
  status: string;
  deadline: string;
  budget: number;
}

const ProviderDashboard = ({ user }: { user: User | null }) => {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch provider profile
      const { data: profileData } = await supabase
        .from("provider_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Fetch assignments
        const { data: assignmentsData } = await supabase
          .from("assignments")
          .select("*")
          .eq("provider_id", profileData.id)
          .order("created_at", { ascending: false });

        if (assignmentsData) {
          setAssignments(assignmentsData);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const activeAssignments = assignments.filter((a) => a.status === "in_progress" || a.status === "accepted");
  const completedAssignments = assignments.filter((a) => a.status === "completed");

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Provider Dashboard</h1>
        <p className="text-muted-foreground">Manage your profile and assignments</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-medium">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold">{profile?.average_rating?.toFixed(1) || "N/A"}</p>
              </div>
              <Star className="h-8 w-8 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{profile?.total_reviews || 0} reviews</p>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold">{activeAssignments.length}</p>
              </div>
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">In progress</p>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedAssignments.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Total jobs</p>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rate</p>
                <p className="text-2xl font-bold">${profile?.hourly_rate || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Per hour</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Profile Status</CardTitle>
            <CardDescription>Keep your profile updated to attract more clients</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Profile Completion</span>
              <Badge variant={profile?.verified ? "default" : "secondary"}>
                {profile?.verified ? "Verified" : "Not Verified"}
              </Badge>
            </div>
            <Button className="w-full" variant="outline">
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest assignment updates</CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No assignments yet</p>
            ) : (
              <div className="space-y-3">
                {assignments.slice(0, 3).map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{assignment.title}</span>
                    <Badge variant="outline" className="ml-2">
                      {assignment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProviderDashboard;

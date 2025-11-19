import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Search, MapPin, DollarSign, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface Provider {
  id: string;
  user_id: string;
  bio: string;
  specialties: string[];
  years_experience: number;
  hourly_rate: number;
  average_rating: number;
  total_reviews: number;
  verified: boolean;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

const Browse = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      const { data } = await supabase
        .from("provider_profiles")
        .select(
          `
          *,
          profiles!provider_profiles_user_id_fkey(full_name, avatar_url)
        `
        )
        .order("average_rating", { ascending: false });

      if (data) {
        setProviders(data);
      }
      setLoading(false);
    };

    fetchProviders();
  }, []);

  const filteredProviders = providers.filter(
    (provider) =>
      provider.profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.specialties?.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Providers</h1>
          <p className="text-muted-foreground">Find the perfect handwriting match for your project</p>
        </div>

        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Search by name, specialty, or style..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading providers...</div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No providers found matching your search</p>
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <Card key={provider.id} className="hover:shadow-strong transition-shadow overflow-hidden">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={provider.profiles.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl">
                        {provider.profiles.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="truncate">{provider.profiles.full_name}</CardTitle>
                        {provider.verified && (
                          <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-accent text-accent" />
                        <span className="font-medium">{provider.average_rating?.toFixed(1) || "New"}</span>
                        <span>({provider.total_reviews || 0})</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription className="line-clamp-3">
                    {provider.bio || "No bio provided yet"}
                  </CardDescription>

                  {provider.specialties && provider.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {provider.specialties.slice(0, 3).map((specialty, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm pt-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">${provider.hourly_rate || 0}/hr</span>
                    </div>
                    {provider.years_experience && (
                      <span className="text-muted-foreground">{provider.years_experience} years exp.</span>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to={`/provider/${provider.id}`}>View Profile</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;

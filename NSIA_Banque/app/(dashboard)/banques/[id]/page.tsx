"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ROLES, ALL_PRODUITS } from "@/lib/utils/constants";
import { useBanqueStore } from "@/lib/store/banqueStore";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { BanqueStats } from "@/components/banques/BanqueStats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBankTheme } from "@/lib/utils/theme";
import { PRODUIT_LABELS, ProduitType } from "@/types";
import { ArrowLeft, Edit, Building2, Users, FileText, Calendar, Mail, Phone, MapPin, Activity } from "lucide-react";
import { useSafeRouter } from "@/lib/hooks/useSafeRouter";
import { BanqueForm } from "@/components/banques/BanqueForm";
import type { Banque } from "@/types";
import { formatDateFull } from "@/lib/utils/date";
import { banqueApi } from "@/lib/api/banques";

export default function BanqueDetailPage() {
  const params = useParams();
  const router = useSafeRouter();
  const { currentBanque, fetchBanque, isLoading } = useBanqueStore();
  const { fetchSimulations, simulations } = useSimulationStore();
  const [users, setUsers] = useState<import("@/types").User[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const banqueId = params?.id as string | undefined;

  useEffect(() => {
    if (banqueId) {
      fetchBanque(banqueId);
      // Charger les utilisateurs via l'API dédiée
      banqueApi.getBanqueUtilisateurs(banqueId)
        .then(setUsers)
        .catch(err => console.error("Erreur chargement utilisateurs:", err));
    }
    fetchSimulations();
  }, [banqueId, fetchBanque, fetchSimulations]);

  // Produits disponibles : depuis l'objet banque (dynamique API)
  const getProduitsForBanque = (banque: Banque): ProduitType[] => {
    if (banque.produits_disponibles && banque.produits_disponibles.length > 0) {
      return banque.produits_disponibles;
    }
    return ALL_PRODUITS;
  };

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN_NSIA, ROLES.ADMIN_NSIA]}>
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </ProtectedRoute>
    );
  }

  if (!currentBanque) {
    return (
      <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN_NSIA, ROLES.ADMIN_NSIA]}>
        <div className="text-center py-12">
          <p className="text-gray-500">Banque introuvable</p>
          <Button onClick={() => router.push("/banques")} className="mt-4">
            Retour à la liste
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  const theme = getBankTheme(currentBanque);
  const produits = getProduitsForBanque(currentBanque);
  const banqueUsers = users;

  // Safe parsing of simulation counts
  const simCount = simulations.filter(s => {
    if (typeof s.banque === 'object' && s.banque !== null && 'id' in s.banque) {
      return String((s.banque as { id: string | number }).id) === String(currentBanque.id);
    }
    return String(s.banque) === String(currentBanque.id);
  }).length;

  // Utiliser est_active computed field, ou statut fallback
  const isActive = currentBanque.est_active !== undefined
    ? currentBanque.est_active
    : (currentBanque.statut === "ACTIF");

  return (
    <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN_NSIA, ROLES.ADMIN_NSIA]}>
      <div className="min-h-screen bg-gray-50/50 pb-10">

        {/* Banner Section */}
        <div className={`relative h-48 w-full overflow-hidden ${theme.gradient}`}>
          {currentBanque.logo ? (
            <img
              src={currentBanque.logo}
              alt={`${currentBanque.nom} logo`}
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
          ) : (
            <div className="absolute inset-0 bg-black/10" />
          )}
          <Button
            variant="ghost"
            className="absolute top-4 left-4 text-white hover:bg-white/20 hover:text-white"
            onClick={() => router.push("/banques")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
        </div>

        {/* Content Container */}
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">

          {/* Header Card */}
          <div className="bg-white rounded-xl shadow-xl p-6 mb-8 border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {currentBanque.logo ? (
                <div className="h-24 w-24 rounded-xl shadow-lg bg-white p-2 border border-gray-100 flex items-center justify-center">
                  <img
                    src={currentBanque.logo}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className={`h-20 w-20 rounded-xl flex items-center justify-center text-3xl font-bold text-white shadow-lg ${theme.gradient}`}>
                  {currentBanque.nom.substring(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <h1 className="text-3xl font-bold text-gray-900">{currentBanque.nom}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="outline" className="text-sm border-gray-300 text-gray-600 bg-gray-50 uppercase font-mono tracking-wider">
                    {currentBanque.code}
                  </Badge>
                  <Badge variant="secondary" className={`${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isActive ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </div>
            </div>
            <Button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-md">
              <Edit className="mr-2 h-4 w-4" /> Modifier
            </Button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Simulations</p>
                  <p className="text-2xl font-bold text-gray-900">{simCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-full">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Utilisateurs</p>
                  <p className="text-2xl font-bold text-gray-900">{banqueUsers.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Produits</p>
                  <p className="text-2xl font-bold text-gray-900">{produits.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Partenariat</p>
                  <p className="text-sm font-bold text-gray-900 leading-tight">
                    {currentBanque.date_partenariat ? formatDateFull(currentBanque.date_partenariat) : "Non défini"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabbed Content */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white shadow-sm p-1 rounded-xl border border-gray-100 w-full md:w-auto grid grid-cols-3 md:inline-flex">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900">Produits & Services</TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900">Utilisateurs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Info Column */}
                <div className="lg:col-span-1 space-y-6">
                  <Card className="border-0 shadow-lg h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-gray-500" /> Coordonnées
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email</p>
                          <p className="text-sm text-gray-600 break-all">{currentBanque.email || "Non renseigné"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Téléphone</p>
                          <p className="text-sm text-gray-600">{currentBanque.telephone || "Non renseigné"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Adresse</p>
                          <p className="text-sm text-gray-600">{currentBanque.adresse || "Non renseignée"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Stats Column */}
                <div className="lg:col-span-2">
                  <BanqueStats banque={currentBanque} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="products">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Catalogue Produits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {produits.map((produit) => (
                      <div key={produit} className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all">
                        <div className="h-10 w-10 mr-4 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 font-bold text-lg">
                          {produit.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{PRODUIT_LABELS[produit] || produit}</p>
                          <p className="text-xs text-gray-500">Produit actif</p>
                        </div>
                      </div>
                    ))}
                    {produits.length === 0 && (
                      <div className="col-span-full text-center py-10 text-gray-500">
                        Aucun produit configuré pour cette banque.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Utilisateurs ({banqueUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {banqueUsers.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {banqueUsers.map((user: any) => (
                        <div key={user.id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                              {user.nom?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user.nom} {user.prenom}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <Badge variant="outline">{user.role}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Aucun utilisateur trouvé pour cette banque.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <BanqueForm
            banque={currentBanque}
            open={isFormOpen}
            onOpenChange={(open) => {
              setIsFormOpen(open);
              if (!open && banqueId) {
                fetchBanque(banqueId);
              }
            }}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}

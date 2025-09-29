import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildEntrepriseJSON } from "@/lib/buildEntrepriseJSON";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siret = searchParams.get("siret");

    if (!siret) {
      return NextResponse.json(
        { error: "Paramètre `siret` requis" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const siren = siret.slice(0, 9);

    const [inpiRes, pappersRes, bodaccRes] = await Promise.allSettled([
      fetch(`https://inpi-crm-project.vercel.app/api/companies?siren=${siren}`),
      fetch(`https://pappers-vercel.vercel.app/api/enrichir?siret=${siret}`),
      fetch(`https://vercel-bodacc.vercel.app/api/bodacc?id=${siret}`)
    ]);

    const inpi = inpiRes.status === "fulfilled" ? await inpiRes.value.json() : null;
    const pappers = pappersRes.status === "fulfilled" ? await pappersRes.value.json() : null;
    const bodacc = bodaccRes.status === "fulfilled" ? await bodaccRes.value.json() : null;

    const entreprise = buildEntrepriseJSON(inpi, pappers, bodacc, siret);

    const prompt = `
Analyse ces données pour DAVANT/Augusto Pizza.
Réponds uniquement JSON:
- "score": entier 0-100
- "analyse": 3-4 phrases concises sur structure, finances, risques, pertinence.

Données :
${JSON.stringify(entreprise, null, 2)}
`;

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: prompt,
    });

    let output = response.output_text.trim();
    if (output.startsWith("```")) {
      output = output.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    const gptResult = JSON.parse(output);

    const finances = (pappers?.finances || []).slice(0, 5).map((f: any) => ({
      annee: f.annee,
      chiffre_affaires: f.chiffre_affaires,
      resultat: f.resultat,
      fonds_propres: f.fonds_propres,
      tresorerie: f.tresorerie,
      dettes_financieres: f.dettes_financieres,
      autonomie_financiere: f.autonomie_financiere,
      liquidite_generale: f.liquidite_generale,
      couverture_dettes: f.couverture_dettes,
      date_de_cloture_exercice: f.date_de_cloture_exercice,
    }));

    return NextResponse.json(
      { ...gptResult, finances },
      { headers: corsHeaders() }
    );

  } catch (error: any) {
    console.error("Erreur API analyseEntreprise:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// ✅ Fonction utilitaire pour les headers CORS
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://davant.crm12.dynamics.com",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// ✅ Gérer les pré-requêtes OPTIONS (nécessaire pour CORS)
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

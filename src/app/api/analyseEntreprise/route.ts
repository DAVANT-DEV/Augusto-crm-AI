/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildEntrepriseJSON } from "@/lib/buildEntrepriseJSON";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siret = searchParams.get("siret");

    if (!siret) {
      return NextResponse.json({ error: "Paramètre `siret` requis" }, { status: 400 });
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

    // Données brutes enrichies
    const entreprise = buildEntrepriseJSON(inpi, pappers, bodacc, siret);

    // Prompt IA
    const prompt = `
Contexte :
Notre entreprise est DAVANT (marque Augusto Pizza).
Clients typiques : hôtels, campings, commerces de proximité, clubs de sport, bars, caves à bière, stations-service, buralistes, casinos, golfs, restaurants et aires de loisirs.

Analyse les données suivantes et réponds uniquement en JSON avec deux clés :
- "score" : un entier entre 0 et 100 reflétant la pertinence comme partenaire.
- "analyse" : un texte concis (3-4 phrases) direct et factuel.

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

    const iaResult = JSON.parse(output);

    // Fusion IA + données brutes
    return NextResponse.json({
      ...iaResult,     // score + analyse
      ...entreprise    // identite, finances, dirigeants, etc.
    });

  } catch (error: any) {
    console.error("Erreur API analyseEntreprise:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

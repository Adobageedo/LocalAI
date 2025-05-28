export async function generateEmailResponse(req: any) {
  const response = await fetch("https://localhost:5001/generate-email-draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    throw new Error("Failed to generate email draft");
  }
  return response.json();
}

import fs from "node:fs";

const prompt = `"Seamless pattern in the style of vintage wall paper. Showcasing bass fish.`;

const formData = new FormData();
formData.append("prompt", prompt);
formData.append("output_format", "webp");
formData.append("aspect_ratio", "1:1");
formData.append("style_preset", "tile-texture");

// const engineId = `stable-diffusion-xl-1024-v1-0`;

const engineId = 'stable-diffusion-v1-6'
const apiHost = process.env.API_HOST ?? 'https://api.stability.ai'

const response = await fetch(
  `${apiHost}/v1/generation/${engineId}/text-to-image`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
    },
    body: JSON.stringify({
      text_prompts: [
        {
          text: prompt,
        },
      ],
      cfg_scale: 5,
      height: 1024,
      width: 1024,
      steps: 30,
      samples: 1,
      style_preset: 'tile-texture',
    }),
  }
)

if (!response.ok) {
  throw new Error(`Non-200 response: ${await response.text()}`)
}

interface GenerationResponse {
  artifacts: Array<{
    base64: string
    seed: number
    finishReason: string
  }>
}


console.log(response.headers);
const responseJSON = (await response.json()) as GenerationResponse

responseJSON.artifacts.forEach((image, index) => {
  const { base64, ...rest } = image
  console.log(rest)
  fs.writeFileSync(
    `./output/${Date.now()}-${prompt}_${index}.png`,
    Buffer.from(image.base64, 'base64')
  )
})



// const response = await fetch(
//   "https://api.stability.ai/v2beta/stable-image/generate/core",
//   {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
//       Accept: "image/*"
//     },
//     body: formData
//   }
// )


// if (response.status === 200) {
//   const data = await response.arrayBuffer();
//   fs.writeFileSync(`./output/${Date.now()}-${prompt}.webp`, Buffer.from(data));
// } else {
//   throw new Error(`${response.status}: ${await response.text()}`);
// }

async function getEngines() {
  const url = `https://api.stability.ai/v1/engines/list`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
      Accept: "application/json"
    }
  }).then((response) => { return response.json() });
  console.log(response);
  return response;
}

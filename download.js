import ytdl from "ytdl-core";
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Only POST allowed" });

  const { url } = req.body;

  // YOUTUBE ---------------------------------------------------------
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    try {
      const id = ytdl.getURLVideoID(url);
      const downloadUrl = `https://${req.headers.host}/api/youtube?id=${id}`;
      return res.status(200).json({ download: downloadUrl });
    } catch {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }
  }

  // INSTAGRAM -------------------------------------------------------
  if (url.includes("instagram.com")) {
    try {
      const cleanURL = url.split("?")[0];

      const response = await fetch(cleanURL + "?__a=1&__d=dis", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Accept: "application/json"
        }
      });

      const json = await response.json();

      const media =
        json?.items?.[0] ??
        json?.graphql?.shortcode_media ??
        null;

      if (!media)
        return res.status(400).json({ error: "Media not found or post is private" });

      // Single video
      if (media.video_versions) {
        return res.status(200).json({
          type: "video",
          download: media.video_versions[0].url
        });
      }

      // Single image
      if (media.image_versions2) {
        return res.status(200).json({
          type: "image",
          download: media.image_versions2.candidates[0].url
        });
      }

      // Carousel
      if (media.carousel_media) {
        const files = media.carousel_media.map(item => {
          if (item.video_versions)
            return item.video_versions[0].url;
          return item.image_versions2.candidates[0].url;
        });

        return res.status(200).json({
          type: "carousel",
          files
        });
      }

      return res.status(400).json({ error: "Unsupported Instagram post type" });

    } catch (err) {
      return res.status(400).json({
        error: "Instagram blocked this request or post is private."
      });
    }
  }

  // INVALID ---------------------------------------------------------
  return res.status(400).json({ error: "Unsupported URL" });
}
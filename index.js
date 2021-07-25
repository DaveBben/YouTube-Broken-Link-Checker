
const { google } = require("googleapis");
const getUrls = require("get-urls");
const fetch = require("node-fetch");


const channelID = "https://www.youtube.com/channel/UCThrs0qvb_MrW9UGSes4uIA";

// Handler
const youtube = google.youtube({
  version: "v3",
  auth: "REPLACE_WITH_AUTH_KEY",
});

const channelVideos = [];


function getYouTubeVideos(playlistID, page) {
  return new Promise((resolve, reject) => {
    youtube.playlistItems
      .list({
        playlistId: playlistID,
        part: "snippet",
        maxResults: 50,
        pageToken: page ? page : "",
      })
      .then((videos) => {
        for (let v of videos.data.items) {
          let newSet = getUrls(v.snippet.description);
          let vid = {
            title: v.snippet.title,
            urls: [],
            id: v.snippet.resourceId.videoId,
          };
          for (address of newSet.values()) {
            vid.urls.push(address);
          }
          channelVideos.push(vid);
        }
        if (videos.data.nextPageToken) {
          resolve(videos.data.nextPageToken);
        }
        resolve(null);
      });
  });
}

function getChannelPlaylist(channelURL) {
  return new Promise((resolve, reject) => {
    let myRegexp = /channel\/(.*)/;
    let match = myRegexp.exec(channelURL)[1];
    youtube.channels
      .list({ id: match, part: "contentDetails" })
      .then((data) => {
        let uploadsID =
          data.data.items[0].contentDetails.relatedPlaylists.uploads;
        resolve(uploadsID);
      });
  });
}

function getStatus(url) {
  return new Promise((resolve, reject) => {
    fetch(url, {
      headers: {host: URL.parse(url).host},
      method: "GET",
    })
      .then(function (response) {
        resolve(response.status);
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

(async function run() {
  let uploadsID = await getChannelPlaylist(channelID);
  let page = await getYouTubeVideos(uploadsID);
  while (page != null) {
    console.log("grabbing videos");
    page = await getYouTubeVideos(uploadsID, page);
    
  }

  const videosWithLinks = channelVideos.filter(
    (video) => video.urls.length > 0
  );
  console.log(`${videosWithLinks.length} videos with links`);
  const brokenVideos = [];

  for (let v of videosWithLinks) {
    let invalidUrls = [];
    for (let i of v.urls) {
      try {
        let status = await getStatus(new URL(i));
        if (status < 200 || status > 299) {
          invalidUrls.push(i);
        }
      } catch (e) {
        if ((e.errno = "ECONNREFUSED")) {
          invalidUrls.push(i);
        }
      }
    }
    if (invalidUrls.length > 0) {
      console.log("---------------------");
      console.log(`Video Title: ${v.title}`);
      for (p of invalidUrls) {
        console.log(p);
      }
 
    }
  }
})();

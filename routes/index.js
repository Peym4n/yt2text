import express from 'express';
const router = express.Router();
import url from 'url';
import * as ycs from "youtube-captions-scraper";
const getSubtitles = ycs.getSubtitles;

const addQuery = (req, res, next) => {
  req.query.url = req.body.vidurl;
  next();
};

/* GET home page. */
router.get('/', function (req, res, next) {
  if(req.query.url && req.query.url !== req.session.vidurl) {
    req.session.text = "";
  }
  res.render('index', {
    title: 'YT to Text',
    text: req.session.text,
    vidurl: req.query.url || req.session.vidurl,
    time: req.session.time,
    join: req.session.join
  });
});



router.post('/2text', function (req, res, next) {
  console.log(req.body);
  req.session.vidurl = req.body.vidurl;
  const urlParts = url.parse(req.body.vidurl, true);
  if (urlParts.query && urlParts.query.v && /^[A-Za-z0-9_-]{11,}$/.test(urlParts.query.v)) {
    let useTime = !!req.body.time;
    let joinLines = !!req.body.join;
    req.session.time = useTime;
    req.session.join = joinLines;
    req.session.text = "";
    getSubtitles({
      videoID: urlParts.query.v, // youtube video id
      lang: 'en' // default: `en`
    }).catch((reason) => {
      console.error(reason);
      req.session.text = reason + "";
      res.redirect('/?url=' + encodeURIComponent(req.session.vidurl));
    }).then(captions => {
      if(!captions) {
        return;
      }
      console.log("Found " + captions.length + " lines.");
      if(joinLines) {
        req.session.text = captions.map(c => c.text).join(" ");
      } else {
        captions.forEach(c => {
          req.session.text += (useTime ? toHHMMSSsss(c.start) + ' -- ' + toHHMMSSsss(c.start*1 + c.dur*1) + ': ' : '') + c.text + '\r\n';
        });
      }

      res.redirect('/?url=' + encodeURIComponent(req.session.vidurl));
    }).catch(reason => console.error(reason));
  } else {
    res.redirect('/');
  }
});

function toHHMMSSsss(val) {
  const sec_num = val*1; // don't forget the second param
  let hours   = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  let seconds = (sec_num - (hours * 3600) - (minutes * 60)).toFixed(0);
  let micros = (sec_num % 1).toFixed(3).substring(2).padStart(3, '0');

  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  return (hours !== "00" ? hours+':' : '')+(minutes !== "00" ? minutes+':' : '')+seconds+'.'+micros;
}

export default router;

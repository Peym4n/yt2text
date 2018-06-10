const express = require('express');
const router = express.Router();
const getSubtitles = require('youtube-captions-scraper').getSubtitles;

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'YT to Text', text: req.session.text, vidid: req.session.vidid, time: req.session.time });
});

router.post('/2text', function (req, res, next) {
  console.log(req.body);
  if (req.body.vidid) {
    let useTime = !!req.body.time;
    req.session.vidid = req.body.vidid;
    req.session.time = useTime;
    req.session.text = "";
    getSubtitles({
      videoID: req.session.vidid, // youtube video id
      lang: 'en' // default: `en`
    }).catch((reason) => {
      console.log("Error:", reason);
      res.redirect('/');
    }).then(captions => {
      console.log(captions);
      captions.forEach(c => {
        req.session.text += (useTime ? c.start + ' + ' + c.dur + ': ' : '') + c.text + '\r\n';
      });
      res.redirect('/');
    });
  } else {
    res.redirect('/');
  }
});

module.exports = router;

<!DOCTYPE html>
<html lang="hy">
<head>
    <meta charset="UTF-8">
    <title>Boec Live</title>
    <script src="https://cdn.jwplayer.com/libraries/IDzF9Zmk.js"></script> <!-- Սա անվճար գրադարանի օրինակ է -->
    <style>
        body {
            margin: 0;
            background-color: black;
        }
        #player {
            width: 100%;
            height: 100vh;
        }
    </style>
</head>
<body>

<div id="player"></div>

<script>
    jwplayer("player").setup({
        file: "https://cors-proxy.cooks.fyi/http://194.26.203.25/8676/video.m3u8?token=ZJCxnTSuyVXKvSG9", // ՊԱՏԱՍԽԱՆԵՔ այս հղումը ձերով
        image: "https://cdn.jwplayer.com/thumbs/IDzF9Zmk-720.jpg", // thumbnail, ցանկության դեպքում
        width: "100%",
        aspectratio: "16:9",
        autostart: true
    });
</script>

</body>
</html>
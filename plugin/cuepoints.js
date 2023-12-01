videojs.registerPlugin('cuePointChaptersPlugin', function (options) {
    var player = this,
        imgRefBase_URL = `https://cf-images.us-east-1.prod.boltdns.net/v1/jit/`,
        pub_id = player.bcinfo.accountId,
        thumbnail_dimensions = '144x81';
    player.on('loadedmetadata', function () {
        let cuePointsArr = new Array(),
            filteredCueArr = new Array(),
            purgedCueArr = new Array(),
            tt = player.textTracks()[0], // ********* Remove ********* for debugging purposes in standalone HTML example
            // Define the video duration as a variable
            videoDuration = player.mediainfo.duration,
            // Get Video Cloud metadata long description field
            longDesc = player.mediainfo.longDescription,
            // Define video ID for playlist player management
            videoId = player.mediainfo.id;
        // Add existing cue point metadata to the cue points array
        for (let i = 0; i < player.mediainfo.cuePoints.length; i++) {
            cuePointsArr.push(player.mediainfo.cuePoints[i]);
        }
        // Check for chapters in the longDescription metadata field, sort and merge
        xtractMatch(longDesc, cuePointsArr, videoDuration, videoId);
        // Add to filtered array based on original
        filteredCueArr = cuePointsArr.filter(cue => (cue.type === 'CODE') || (cue.type === 'TEXT'));
        // Remove duplicates based on time and replace
        purgedCueArr = dedupeArr(filteredCueArr);
        // Assign endTime to cue points in sorted array
        assignCueEndTime(purgedCueArr, videoDuration);
        // Take purged cue point information and add cue markers to player progress bar
        addCueEl(purgedCueArr, videoDuration, options);
        if (purgedCueArr.length != 0) chapterThumbContainer(), chapterThumbs(imgRefBase_URL, pub_id, getBoltId(player.mediainfo.poster), purgedCueArr, thumbnail_dimensions);
        // If playlist player/playlist is present - clear UI for new playlist item
        if (player.playlistUi !== undefined) player.on('playlistitem', function () { rmCueEl() })
    })
});

const xtractMatch = (string, arr, videoDuration, videoId) => {
    if (string === null) return (arrSort(arr));
    // Match time formats M:SS, MM:SS, HH:MM:SS, H:MM:SS
    let tRex = new RegExp(/(^(?:[01]\d|2[0-3]|[0-59]):[0-5]\d:[0-5]\d)|(^(?:[0-5]\d|2[123]|[0-59]):[0-5]\d)/gm),
        // Match whole line that begins with 00: Lines with time format not at the beginning are ignored
        dRex = new RegExp(/^.*?(^[0-5][0-9]:|^[0-59]:).*$/gm),
        chaptrTime = string.match(tRex),
        chaptrName = string.match(dRex);
    // No found chapters - sort the array as it is and skip adding any further cue information
    if (chaptrTime === null) return (arrSort(arr));
    for (let i = 0; i < chaptrTime.length; i++) {
        let time = chaptrTime[i].split(':'),
            description = chaptrName[i].slice(chaptrTime[i].length),
            seconds,
            // Add ranomised 13 digit ID
            idNum = Math.floor(Math.random() * 9000000000000) + 1000000000000;
        // Strip hyphens and other intersting chars from string and trim whitespace    
        description = stringTidy(description);
        // push into array objects
        timeConversion(arr, time, idNum, seconds, description, videoDuration, videoId);
    }
    // Sort array based on time
    arrSort(arr);
}

// Array sort - order array based on time from lowest to highest
const arrSort = (arr) => {
    arr.sort((a, b) => {
        return a.time - b.time;
    });
}

// Removal of hyphens, pluses but allows inverted commas etc
const stringTidy = (str) => {
    str = str.replace(/([.,\/;:*{}=\-_~()<>{}+])/g, '');
    // Remove whitespace form either end of the string
    str = str.trim();
    return (str);
}

const timeConversion = (arr, time, idNum, seconds, description, duration, videoId) => {
    // Check for words in description if none set fields to blank
    if (description.match(/\b[^\d\W]+\b/g) === null) description = '';
    if (time.length === 2) {
        // Convert MM:SS to seconds
        seconds = (Number.parseFloat(time[0]) * 60 + Number.parseFloat(time[1]));
        // If chapter is longer than the video skip
        if (seconds > duration) return;
        arr.push({
            id: `${idNum}`,
            name: description,
            type: 'TEXT',
            time: seconds,
            metadata: description,
            startTime: seconds,
            endTime: '',
            video_id: videoId
        });
    }
    if (time.length === 3) {
        // Convert HH:MM:SS to seconds
        seconds = (Number.parseFloat(time[0]) * 3600 + Number.parseFloat(time[1]) * 60 + Number.parseFloat(time[2]));
        // If chapter is longer than the video skip
        if (seconds > duration) return;
        arr.push({
            id: `${idNum}`,
            name: description,
            type: 'TEXT',
            time: seconds,
            metadata: description,
            startTime: seconds,
            endTime: '',
            video_id: videoId
        });
    }
}

// Filter array through map - remove duplicates
const dedupeArr = (arr) => {
    let mapObj = new Map()
    arr.forEach(v => {
        let prevValue = mapObj.get(v.time)
        if (!prevValue) {
            mapObj.set(v.time, v)
        }
    })
    return [...mapObj.values()];
}

// Hacky method to reassign endTime cue data in array after arrSort
const assignCueEndTime = (arr, duration) => {
    // Order the array on time again - for loop uses time from preceding array object 
    arrSort(arr);
    let v = 1;
    for (let i = 0; i < arr.length; i++) {
        if (v <= arr.length - 1) arr[i].endTime = arr[v].time;
        // If last object in array set end time to video duration
        if (v === arr.length) arr[i].endTime = duration;
        v++;
    }
}

// Build cue point markers and add them to the player progress bar
const addCueEl = (arr, videoDuration, options) => {
    let playerWidth = document.querySelector('.video-js').offsetWidth,
        controlBar = document.querySelector('.vjs-progress-control'),
        progresBar = document.querySelector('.vjs-progress-holder'),
        cueControl = document.createElement('div'),
        cueTip = document.createElement('div');
    cueTip.className = 'vjs-cue-tip';
    cueControl.className = 'vjs-cue-control';
    cueControl.style.setProperty('--cue-control-width', playerWidth + 'px');
    controlBar.prepend(cueControl);
    progresBar.appendChild(cueTip);
    // Loop through array and add elements
    for (let i = 0; i < arr.length; i++) {
        let el = document.createElement('div');
        el.className = 'vjs-cue-marker';
        el.id = 'marker' + i;
        el.style.setProperty('--marker-color', options.cue_marker_color);
        // On mouse over event - add mouse event listener to cue marker elements
        el.addEventListener("mouseover", (e) => {
            setCueInfo(e, arr);
        });
        let time = arr[i].time;
        // Based on proportion of width in px using time 
        el.style.left = `${Math.round(time / videoDuration * playerWidth)}px`;
        cueControl.append(el);
    }
    // Create the inner placeholder for the cue point data on the tooltips
    createCueInfoEl();
}

// Remove created elements if playlist is present and new video has loaded
const rmCueEl = () => {
    let cueControl = document.querySelector('.vjs-cue-control'),
        cueTip = document.querySelector('.vjs-cue-tip');
    if (cueTip !== null) cueTip.remove();
    if (cueControl !== null) cueControl.remove();
}

// Create and introduce to DOM the information tool data
const createCueInfoEl = () => {
    let cueTipData = document.createElement('p'),
        cueTip = document.querySelector('.vjs-cue-tip');
    cueTipData.className = 'vjs-cue-data';
    cueTip.appendChild(cueTipData);
}

// Create the chapter elements and add them to DOM
const chapterThumbContainer = () => {
    let chapterContainer = document.createElement('div');
    chapterContainer.id = 'vjs-chapter-container';
    document.getElementsByTagName('video-js')[0].style.overflow = "visible";
    chapterContainer.innerHTML = `
  <div id="chapter_title_container">
    <h3 id="chapter_title">Chapters</h3>
  </div>
  <div id="chapter_left_arrow_container" class="chapter_arrow_container">
    <div id="chapter_left_arrow" class="chapter_arrow">
      <div id="chapter_chevron_left" class="chapter_arrow_chevron">
        <div class="chapter_chevron_shape">
          <div class="chevron_shape">
            <div class="chevron_arrow">
              <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
                <path d="M14.96 18.96 8 12l6.96-6.96.71.71L9.41 12l6.25 6.25-.7.71z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="chapter_left_arrow_button"></div>
  </div>
  <div id="chapter_col_container">
    <div id="chapter_col_wrapper"></div>
  </div>
  <div id="chapter_right_arrow_container" class="chapter_arrow_container">
    <div id="chapter_right_arrow" class="chapter_arrow">
      <div id="chapter_chevron_right" class="chapter_arrow_chevron">
        <div class="chapter_chevron_shape">
          <div class="chevron_shape">
            <div class="chevron_arrow">
              <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
                <path d="m9.4 18.4-.7-.7 5.6-5.6-5.7-5.7.7-.7 6.4 6.4-6.3 6.3z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="chapter_right_arrow_button"></div>
  </div>
  `
    document.querySelector('.vjs-player-info-modal').insertAdjacentElement('afterend', chapterContainer);
}

// Control mouse interaction with the cue markers - Initiated on hover state
const setCueInfo = (e, arr) => {
    let i = e.target.id.slice(6),
        cueHolder = document.querySelector('.vjs-cue-control').offsetWidth,
        cueMarker = document.querySelectorAll('.vjs-cue-marker')[i],
        cueTip = document.querySelector('.vjs-cue-tip'),
        cueTipData = document.querySelector('.vjs-cue-data');
    cueTip.classList.add('vjs-cue-tip-visible');
    cueTipData.innerHTML = `${arr[i].name}`;
    cueTip.style.display = null;
    // Display cue tool tip on left or right of marker on hover based on position
    if (cueMarker.offsetLeft > cueHolder / 2) {
        cueTipData.classList.remove('vjs-cue-data-right');
        cueTipData.classList.add('vjs-cue-data-left');
        cueTip.style.left = null;
        cueTip.style.right = cueHolder - cueMarker.offsetLeft + 20 + 'px';
    } else {
        if (arr[i].time === 0) cueMarker.classList.add('initial-marker');
        cueTipData.classList.remove('vjs-cue-data-left');
        cueTipData.classList.add('vjs-cue-data-right');
        cueTip.style.right = null;
        cueTip.style.left = cueMarker.offsetLeft + 20 + 'px';
    }
    if (arr[i].name === '') cueTip.style.display = 'none';
    // Mouse move event - follow the mouse pointer on Y axis only
    cueMarker.addEventListener('mousemove', (e) => {
        cueTip.style.top = e.offsetY - 27 + 'px';
    });
    // On mouse out event - remove inline styles and classes
    cueMarker.addEventListener('mouseout', () => {
        cueTip.classList.remove('vjs-cue-tip-visible');
    });
}

// Extract media Bolt ID from the URL path
const getBoltId = (url) => {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);
    return segments.length >= 5 ? segments[3] : null;
};

// Convert time in seconds back to digital HH:MM:SS format or MM:SS depending on duration
const convertTime = (seconds) => {
    seconds = Math.round(seconds);
    let hours = Math.floor(seconds / 3600),
        minutes = Math.floor(seconds / 60),
        remainderSeconds = seconds % 60;
    if (seconds >= 3600) return (hours < 10 ? '0' + hours : hours) + ":" + (minutes < 10 ? '0' + minutes : minutes) + ":" + (remainderSeconds < 10 ? '0' + remainderSeconds : remainderSeconds);
    if (seconds < 3600) return (minutes < 10 ? '0' + minutes : minutes) + ":" + (remainderSeconds < 10 ? '0' + remainderSeconds : remainderSeconds);
}

// Generate the chapter thumbnails based on data in the filtered array
const chapterThumbs = (url, pub_id, bolt_id, arr, dim) => {
    const thumbURL = url + pub_id + '/' + bolt_id + '/main/' + dim + '/',
        chapter_arrow_container = document.querySelectorAll('.chapter_arrow_container'),
        chapter_left_arrow_button = document.querySelector('#chapter_left_arrow'),
        chapter_right_arrow_button = document.querySelector('#chapter_right_arrow'),
        chapter_col_wrapper = document.querySelector('#chapter_col_wrapper');
    // Loop through and build array
    for (let i = 0; i < arr.length; i++) {
        let chapter_col = document.createElement('div');
        chapter_col.class = 'chaper_col';
        chapter_col.innerHTML = `
            <div class="chapter_anchor">
                <img class="chapter_thumbnail" src="${thumbURL + arr[i].time}s/match/image.jpg">
                <div class="chapter_details">
                <div class="chapter_time">${convertTime(arr[i].time)}</div>
                    <h4 class="chapter_description">${arr[i].name}</h4>
                </div>
            </div>
        `;
        chapter_col_wrapper.appendChild(chapter_col);
        let chapter_anchor = document.querySelectorAll('.chapter_anchor');
        // Adding event listener on chapters for each video cue point
        chapter_anchor[i].addEventListener('click', function(){
            myPlayer.player.currentTime(arr[i].time);
            myPlayer.player.play();
        });
    }
    // Add event listener to the arrpow buttons
    chapter_left_arrow_button.addEventListener('click', () => checkCarouselOverflow('left'));
    chapter_right_arrow_button.addEventListener('click', () => checkCarouselOverflow('right'));
    if (arr.length <= 5) {
        chapter_arrow_container.forEach(function (element) {
            element.style.display = 'none';
        })
    }
    onElementAdded(chapter_col_wrapper);
}

// Add the observer to watch carousel wrapper as page loads to updaate element width for scroll
function onElementAdded(chapter_col_wrapper) {
    if (chapter_col_wrapper) {
        resizeObserver.observe(chapter_col_wrapper);
    }
}

// Callback to check mutation of the chapter wrapper element
const resizeObserverCallback = entries => {
    checkCarouselOverflow();
};

// Get boundaries of chapter window (parent) and the wrapper (child) calculate offset and display controls
const resizeObserver = new ResizeObserver(resizeObserverCallback);
let currentPosition = 0;
const checkCarouselOverflow = (direction) => {
    const p = document.querySelector('#chapter_col_container'),
        c = document.querySelector('#chapter_col_wrapper'),
        chapter_left_arrow_button = document.querySelector('#chapter_left_arrow'),
        chapter_right_arrow_button = document.querySelector('#chapter_right_arrow'),
        chapter_col_count = document.querySelectorAll('.chapter_col').length,
        // Get number of elements in the carousel and divide that by the widh - added multiplier to create greater increment
        carousel_shift = Number(c.offsetWidth / chapter_col_count) * 5,
        maxTranslateLeft = 0,
        maxTranslateRight = -(c.offsetWidth - p.offsetWidth);
    // Display buttons based on boundaries
    const buttonVisibility = () => {
        chapter_left_arrow_button.style.display = currentPosition < maxTranslateLeft ? 'block' : 'none';
        chapter_right_arrow_button.style.display = currentPosition > maxTranslateRight ? 'block' : 'none';
        // resizeObserver.unobserve(c);
    }
    // Move the chapter thumbnails based on the calulated thumbnail width
    const moveEl = () => {
        if (direction === 'right') {
            currentPosition = Math.max(currentPosition - carousel_shift, maxTranslateRight);
        } else if (direction === 'left') {
            currentPosition = Math.min(currentPosition + carousel_shift, 0);
        }
        c.style.transform = `translateX(${currentPosition}px)`;
    }
    // Call the functions to move the elements (chapter wrapper) and diplay the appropriate buttons
    moveEl();
    buttonVisibility();
}
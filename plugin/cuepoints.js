videojs.registerPlugin('cuePointChaptersPlugin', function (options) {
    const player = this;
    options = Object.assign({}, options);
    let chapterRoot = null, renderGeneration = 0, disposed = false, lastSignature = null;
    const query = selector => player.el().querySelector(selector) || chapterRoot?.querySelector(selector) || (chapterRoot?.matches(selector) ? chapterRoot : null);
    const queryAll = selector => [...player.el().querySelectorAll(selector), ...(chapterRoot?.querySelectorAll(selector) || [])];
    const getElement = id => query('#' + id);

    // Display chapter thumbnails, scrub bar markers or both based on options
    const defineChapters = (player, purgedCueArr, videoDuration, options) => {
        let display = options.display;
        switch (display) {
            case 'chapters':
                if (purgedCueArr.length != 0) chapterThumbContainer(options), chapterThumbs(player, purgedCueArr, options);
                break;
            case 'markers':
                addCueEl(purgedCueArr, videoDuration, options);
                break;
            case 'both':
                addCueEl(purgedCueArr, videoDuration, options);
                if (purgedCueArr.length != 0) chapterThumbContainer(options), chapterThumbs(player, purgedCueArr, options);
                break;
            default:
                addCueEl(purgedCueArr, videoDuration, options);
                if (purgedCueArr.length != 0) chapterThumbContainer(options), chapterThumbs(player, purgedCueArr, options);
        }
    }

    // Check for presence of VTT file, SSAI, CSAI or thumbnail enabled player
    const filterVTTUrl = async (player) => {
        const ssai = typeof player.ssai === 'function' ? player.ssai() : null;
        const url = ssai?.vmap?.thumbnails?.[0]?.url;
        if (url) return url;
        if (player.activePlugins_?.ima3) return null;
        const thumbnailPlugin = typeof player.thumbnails === 'function' ? player.thumbnails() : null;
        return thumbnailPlugin?.metadataTrackEl_?.src ||
            Array.from(player.remoteTextTrackEls?.() || []).find(el => el.track?.label === 'thumbnails')?.src || null;
    };

    // Fetch the VTT file if present
    const fetchVTTFile = async (url) => {
        console.log(url);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Thumbnail VTT request failed');
            const data = await response.text();
            return data;
        } catch (error) {
            console.error('Error fetching VTT file:', error);
            return null;
        }
    };

    const parseVTT = (vtt_data) => {
        if (!vtt_data || typeof WebVTT === 'undefined') return [];
        const parser = new WebVTT.Parser(window, WebVTT.StringDecoder()),
            vtt_image_array = new Array();
        parser.oncue = function(cue) {
            vtt_image_array.push({ start: cue.startTime, end: cue.endTime, img_src: cue.text });
        };
        parser.parse(vtt_data);
        parser.flush();
        return vtt_image_array;
    };

    const xtractMatch = (string, arr, videoDuration, videoId) => {
        if (typeof string !== 'string') return (arrSort(arr));
        // Match time formats M:SS, MM:SS, HH:MM:SS, H:MM:SS
        let tRex = new RegExp(/(^(?:[01]\d|2[0-3]|[0-59]):[0-5]\d:[0-5]\d)|(^(?:[0-5]\d|2[123]|[0-59]):[0-5]\d)/gm),
            // Only lines beginning with a timestamp are included
            dRex = new RegExp(/^.*?(^[0-5][0-9]:|^[0-59]:).*$/gm),
            chaptrTime = string.match(tRex),
            chaptrName = string.match(dRex);
        if (chaptrTime === null) return (arrSort(arr));
        for (let i = 0; i < chaptrTime.length; i++) {
            let time = chaptrTime[i].split(':'),
                description = chaptrName[i].slice(chaptrTime[i].length),
                seconds,
                idNum = Math.floor(Math.random() * 9000000000000) + 1000000000000;
            description = stringTidy(description);
            timeConversion(arr, time, idNum, seconds, description, videoDuration, videoId);
        }
        arrSort(arr);
    }

    // Sort chronologically
    const arrSort = (arr) => {
        arr.sort((a, b) => {
            return a.time - b.time;
        });
    }

    const stringTidy = (str) => {
        str = str.replace(/([.,\/;:*{}=\-_~()<>{}+])/g, '');
        str = str.trim();
        return (str);
    }

    const timeConversion = (arr, time, idNum, seconds, description, duration, videoId) => {
        if (description.match(/\b[^\d\W]+\b/g) === null) description = '';
        if (time.length === 2) {
            seconds = (Number.parseFloat(time[0]) * 60 + Number.parseFloat(time[1]));
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
            seconds = (Number.parseFloat(time[0]) * 3600 + Number.parseFloat(time[1]) * 60 + Number.parseFloat(time[2]));
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

    // Remove duplicate timestamps, retaining the first source
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

    const assignCueEndTime = (arr, duration) => {
        arrSort(arr);
        let v = 1;
        for (let i = 0; i < arr.length; i++) {
            if (v <= arr.length - 1) arr[i].endTime = arr[v].time;
            if (v === arr.length) arr[i].endTime = duration;
            v++;
        }
    }

    // Build cue point markers and add them to the player progress bar
    const addCueEl = (arr, videoDuration, options) => {
        let playerWidth = player.el().offsetWidth,
            controlBar = query('.vjs-progress-control'),
            progresBar = query('.vjs-progress-holder'),
            cueControl = document.createElement('div'),
            cueTip = document.createElement('div');
        cueTip.className = 'vjs-cue-tip';
        cueControl.className = 'vjs-cue-control';
        cueControl.style.setProperty('--cue-control-width', playerWidth + 'px');
        if (!controlBar || !progresBar || !Number.isFinite(videoDuration) || videoDuration <= 0) return;
        cueControl.style.width = '100%';
        cueControl.style.pointerEvents = 'none';
        progresBar.appendChild(cueControl);
        progresBar.appendChild(cueTip);

        for (let i = 0; i < arr.length; i++) {
            let el = document.createElement('div');
            el.className = 'vjs-cue-marker';
            el.id = 'marker' + i;
            if (!options.cue_marker_color || !/^(#[0-9a-f]{3,4}(?:[0-9a-f]{3,4})?|rgba?\(\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(0|1|0?\.\d+))?\s*\)|[a-z]+)$/i.test(options.cue_marker_color)) options.cue_marker_color = "#FFF";
            el.style.setProperty('--marker-color', options.cue_marker_color);
            el.addEventListener("mouseover", (e) => {
                setCueInfo(e, arr);
            });
            let time = arr[i].time;
            el.style.left = `${time / videoDuration * 100}%`;
            el.style.pointerEvents = 'auto';
            cueControl.append(el);
        }
        createCueInfoEl();
    }

    // Remove plugin UI when changing videos or disposing the player
    const disposeEl = () => {
        let cueControl = query('.vjs-cue-control'),
            cueTip = query('.vjs-cue-tip'),
            chapterControl = query('#vjs-chapter-container');
        if (cueTip) cueTip.remove();
        if (cueControl) cueControl.remove();
        if (chapterControl) resizeObserver.disconnect(), chapterControl.remove(), currentPosition = 0;
        chapterRoot = null;
    }

    const createCueInfoEl = () => {
        let cueTipData = document.createElement('p'),
            cueTip = query('.vjs-cue-tip');
        cueTipData.className = 'vjs-cue-data';
        cueTip.appendChild(cueTipData);
    }

    // Create the chapter carousel
    const chapterThumbContainer = (options) => {
        let chapterContainer = document.createElement('div');
        chapterContainer.id = 'vjs-chapter-container';
        chapterContainer.innerHTML = `
            <div id="chapter_load_container">
                <div id="chapter_load_wrapper">
                    <div id="chapter_load_progress"></div>
                </div>
                <p id="chapter_load_text">Loading:</p>
            </div>
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
        if (!options.chapter_bg_color || !/^(#[0-9a-f]{3,4}(?:[0-9a-f]{3,4})?|rgba?\(\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(0|1|0?\.\d+))?\s*\)|[a-z]+)$/i.test(options.chapter_bg_color)) options.chapter_bg_color = 'transparent';
        chapterContainer.style.setProperty('--chapter-color', options.chapter_bg_color);
        player.el().insertAdjacentElement('afterEnd', chapterContainer);
        chapterRoot = chapterContainer;
    }

    // Show marker tooltips
    const setCueInfo = (e, arr) => {
        let i = e.target.id.slice(6),
            cueHolder = query('.vjs-cue-control').offsetWidth,
            cueMarker = queryAll('.vjs-cue-marker')[i],
            cueTip = query('.vjs-cue-tip'),
            cueTipData = query('.vjs-cue-data');
        cueTip.classList.add('vjs-cue-tip-visible');
        cueTipData.textContent = arr[i].name;
        cueTip.style.display = null;

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
        cueMarker.addEventListener('mousemove', (e) => {
            cueTip.style.top = e.offsetY - 27 + 'px';
        });
        cueMarker.addEventListener('mouseout', () => {
            cueTip.classList.remove('vjs-cue-tip-visible');
        });
    }

    const matchVTTTime = (url, seconds, vtt_image_array) => {
        if (!vtt_image_array[0]) return url;
        let time_match = vtt_image_array.find(obj => seconds >= obj.start && seconds < obj.end);
        return time_match ? time_match.img_src : url;
    }

    // Format time as HH:MM:SS or MM:SS
    const convertTime = (seconds) => {
        seconds = Math.round(seconds);
        let hours = Math.floor(seconds / 3600),
            minutes = Math.floor((seconds % 3600) / 60),
            remainderSeconds = seconds % 60;
        const minSec = (minutes < 10 ? '0' + minutes : minutes) + ":" + (remainderSeconds < 10 ? '0' + remainderSeconds : remainderSeconds);
        return hours > 0 ? (hours < 10 ? '0' + hours : hours) + ":" + minSec : minSec;
    }

    // Generate chapter thumbnails and navigation
    const chapterThumbs = (player, arr, dim) => {
        const chapter_col_wrapper = query('#chapter_col_wrapper'),
            chapter_arrow_container = queryAll('.chapter_arrow_container'),
            chapter_left_arrow_button = query('#chapter_left_arrow'),
            chapter_right_arrow_button = query('#chapter_right_arrow'),
            totalImages = arr.length;
        let loadedImages = 0,
            loadPromises = [];

        const updateLoadingBar = () => {
            const percentage = (loadedImages / totalImages) * 100;
            getElement('chapter_load_progress').style.width = `${percentage}%`;
        };

        const getVTTData = async () => {
            const generation = renderGeneration;
            const fallback = player.mediainfo?.thumbnail || player.mediainfo?.poster || player.poster?.() || '';
            const thumbnailTrack = Array.from(player.textTracks()).find(track => track.kind === 'metadata' && track.label === 'thumbnails');
            let vtt_image_array = Array.from(thumbnailTrack?.cues || [], cue => ({start: cue.startTime, end: cue.endTime, img_src: cue.text}));
            const url = vtt_image_array.length ? null : await filterVTTUrl(player);
            if (!vtt_image_array.length && url) vtt_image_array = parseVTT(await fetchVTTFile(url));
            if (generation !== renderGeneration || disposed) return;
            const baseURL = url || Array.from(player.remoteTextTrackEls?.() || []).find(el => el.track === thumbnailTrack)?.src || document.baseURI;
            vtt_image_array = vtt_image_array.flatMap(cue => {
                try {return [{...cue, img_src: new URL(cue.img_src, baseURL).href}];}
                catch (_) {return [];}
            });

            if (!dim.thumbnail_w || !/^\d+$/.test(dim.thumbnail_w)) {
                dim.thumbnail_w = '144';
            }

            for (let i = 0; i < arr.length; i++) {
                const chapter_col = document.createElement('div');
                chapter_col.classList.add('chapter_col', 'hidden');
                const vtt_img_src = matchVTTTime(fallback, arr[i].time, vtt_image_array);

                const imgElement = document.createElement('img');
                imgElement.classList.add('chapter_thumbnail');
                imgElement.style.width = `${dim.thumbnail_w}px`;
                const sprite = /#xywh=(\d+),(\d+),(\d+),(\d+)$/.exec(vtt_img_src);
                if (sprite) {
                    const scale = Number(dim.thumbnail_w) / Number(sprite[3]);
                    imgElement.style.height = `${Number(sprite[4]) * scale}px`;
                    imgElement.style.objectFit = 'none';
                    imgElement.style.objectPosition = `-${sprite[1]}px -${sprite[2]}px`;
                    // Crop sprites through a background to support scaling
                    imgElement.style.backgroundImage = `url("${vtt_img_src.split('#')[0]}")`;
                    imgElement.style.backgroundPosition = `-${sprite[1] * scale}px -${sprite[2] * scale}px`;
                }

                const chapterDetails = document.createElement('div');
                chapterDetails.className = 'chapter_details';
                const chapterTime = document.createElement('div');
                chapterTime.className = 'chapter_time';
                chapterTime.textContent = convertTime(arr[i].time);
                const chapterTitle = document.createElement('h4');
                chapterTitle.className = 'chapter_description';
                chapterTitle.textContent = arr[i].name;
                chapterDetails.append(chapterTime, chapterTitle);
                const chapter_anchor = document.createElement('div');
                chapter_anchor.classList.add('chapter_anchor');
                chapter_anchor.tabIndex = 0;
                chapter_anchor.setAttribute('role', 'button');
                chapter_anchor.append(imgElement, chapterDetails);
                chapter_col.appendChild(chapter_anchor);
                chapter_col_wrapper.appendChild(chapter_col);

                let imgPromise = new Promise((resolve) => {
                    let settled = false;
                    imgElement.onload = () => {
                        if (settled) return;
                        settled = true;
                        if (generation !== renderGeneration || disposed) return resolve();
                        if (sprite) {
                            const scale = Number(dim.thumbnail_w) / Number(sprite[3]);
                            imgElement.style.backgroundSize = `${imgElement.naturalWidth * scale}px ${imgElement.naturalHeight * scale}px`;
                            imgElement.style.objectPosition = '99999px 99999px';
                        }
                        loadedImages++;
                        updateLoadingBar();
                        resolve();
                    };
                    imgElement.onerror = () => {
                        if (settled) return;
                        settled = true;
                        if (generation !== renderGeneration || disposed) return resolve();
                        loadedImages++;
                        updateLoadingBar();
                        imgElement.style.display = 'none';
                        resolve();
                    };
                });
                imgElement.src = sprite ? vtt_img_src.split('#')[0] : vtt_img_src;
                if (!vtt_img_src) imgElement.onerror();
                else if (imgElement.complete) {
                    if (imgElement.naturalWidth) imgElement.onload();
                    else imgElement.onerror();
                }
                loadPromises.push(imgPromise);

                chapter_anchor.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); chapter_anchor.click();}
                });
                chapter_anchor.addEventListener('click', function(){
                    player.currentTime(arr[i].time);
                    player.play();
                });
            }

            Promise.all(loadPromises).then(() => {
                if (generation !== renderGeneration || disposed) return;
                let chapter_cols = queryAll('.chapter_col');
                chapter_cols.forEach(col => {
                    col.classList.remove('hidden');
                });
                getElement('chapter_load_container').style.display = 'none';
            }).catch(error => {
                console.error("An error occurred loading one or more images", error);
            });
        };

        getVTTData().catch(error => console.error('Chapter thumbnails:', error));
        chapter_left_arrow_button.addEventListener('click', () => checkCarouselOverflow('left'));
        chapter_right_arrow_button.addEventListener('click', () => checkCarouselOverflow('right'));
        if (arr.length <= 5) {
            chapter_arrow_container.forEach(function (element) {
                element.style.display = 'none';
            })
        }
        onElementAdded(chapter_col_wrapper);
    }

    function onElementAdded(chapter_col_wrapper) {
        if (chapter_col_wrapper) {
            resizeObserver.observe(chapter_col_wrapper);
        }
    }

    const resizeObserverCallback = _entries => {
        checkCarouselOverflow();
    };

    const resizeObserver = new ResizeObserver(resizeObserverCallback);
    let currentPosition = 0;
    const checkCarouselOverflow = (direction) => {
        if (!chapterRoot) return;
        const p = query('#chapter_col_container'),
            c = query('#chapter_col_wrapper'),
            chapter_left_arrow_button = query('#chapter_left_arrow'),
            chapter_right_arrow_button = query('#chapter_right_arrow'),
            chapter_col_count = queryAll('.chapter_col').length,
            carousel_shift = Number(c.offsetWidth / chapter_col_count) * 5,
            maxTranslateLeft = 0,
            maxTranslateRight = Math.min(0, -(c.offsetWidth - p.offsetWidth));

        const buttonVisibility = () => {
            chapter_left_arrow_button.style.display = currentPosition < maxTranslateLeft ? 'block' : 'none';
            chapter_right_arrow_button.style.display = currentPosition > maxTranslateRight ? 'block' : 'none';
        }

        const moveEl = () => {
            if (direction === 'right') {
                currentPosition = Math.max(currentPosition - carousel_shift, maxTranslateRight);
            } else if (direction === 'left') {
                currentPosition = Math.min(currentPosition + carousel_shift, 0);
            }
            c.style.transform = `translateX(${currentPosition}px)`;
        }
        moveEl();
        buttonVisibility();
    }

    const refresh = () => {
        if (disposed) return;
        const info = player.mediainfo || {};
        const duration = Number(info.duration || player.duration());
        if (!Number.isFinite(duration) || duration <= 0) return;
        const cues = (info.cuePoints || []).filter(cue => cue.type === 'CODE' || cue.type === 'TEXT').map(cue => ({...cue, time: Number(cue.time)}));
        xtractMatch(info.longDescription, cues, duration, info.id);

        // First source wins: cue points, long description, then chapter tracks
        if (options.chapter_tracks !== false) {
            Array.from(player.textTracks()).filter(track => track.kind === 'chapters').forEach((track, trackIndex) => {
                Array.from(track.cues || []).forEach((cue, index) => cues.push({
                    id: `chapter-${trackIndex}-${index}`, type: 'TEXT', time: cue.startTime,
                    startTime: cue.startTime, endTime: cue.endTime, name: cue.text, metadata: cue.text, video_id: info.id
                }));
            });
        }

        const merged = dedupeArr(cues.filter(cue => Number.isFinite(cue.time) && cue.time >= 0 && cue.time < duration));
        assignCueEndTime(merged, duration);
        const thumbnails = Array.from(player.textTracks()).find(track => track.kind === 'metadata' && track.label === 'thumbnails');
        const signature = JSON.stringify([info.id, duration, merged.map(cue => [cue.time, cue.name]), Array.from(thumbnails?.cues || [], cue => [cue.startTime, cue.endTime, cue.text])]);
        if (signature === lastSignature) return;
        lastSignature = signature;
        renderGeneration++;
        disposeEl();
        if (merged.length) defineChapters(player, merged, duration, options);
    };

    const reset = () => {
        renderGeneration++;
        lastSignature = null;
        disposeEl();
    };

    player.on('loadstart', reset);
    player.on(['loadedmetadata', 'durationchange', 'texttrackchange'], refresh);

    // Cues can arrive asynchronously, including while playback is paused
    const timer = player.setInterval(refresh, 500);

    player.on('dispose', () => {
        disposed = true;
        renderGeneration++;
        player.clearInterval(timer);
        resizeObserver.disconnect();
        disposeEl();
    });

    player.ready(refresh);
});
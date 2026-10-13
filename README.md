# Brightcove - Chapter thumbnails & cuepoint markers plugin

This is an update on the [Cue-Point Markers Plugin](https://github.com/vanemmerik/cuepoints_markers_plugin). A Brightcove player plugin that adds cue point markers and associated metadata dynamically to the player progress bar and adds the filmstrip style chapters layout below the player as well.
The plugin supports Video Cloud cue points, timestamps in the long description and native chapter text tracks, including those used by the Brightcove Prism UI. All three sources can populate the existing progress-bar markers and filmstrip-style chapter carousel shown below.

> [!IMPORTANT]
> For this plugin to successfully display please use the ***advanced embed*** method.
> We're working on the iframe embed but it needs some adjustment in order to display the plugin correctly.

![video player](readme_images/chapter_bar.gif)

> [!WARNING]
> This plugin is for demonstration purposes only. ***Use in production at your own peril***.
> The Image references for the chapter carousel are based off the thumbnail VTT file and a v7 _or later_ Brightcove player is preferred for the plugin to perform as expected.
> Also of note, please enable thumbnails on the player you intend to use. Never fear, if you don't use a thumbnail enabled player the poster image will be repurposed for use for the thumbnail images akin to YouTube.
> If you prefer the richer experience ensure you use a thumbnail enabled player.
> The options are found in the [Video Cloud Players Module](https://player.support.brightcove.com/plugins/thumbnails-plugin.html#Implementing_thumbnails_using_Studio).

The plugin combines all available chapter sources. At matching timestamps, Video Cloud CODE/TEXT cue points take priority, followed by long-description timestamps, then native chapter tracks.\
Unlike other implementations of chaptering there is no need for the admin to add an index or marker at `00:00` of the video.\
\
#### Compatibility and validation

The original implementation was tested against Brightcove Player versions 7.2.* and 6.67.*, with limited browser testing on Firefox 110.0.1, Chrome 111.0.5563.64 and Safari 16.3. These results predate native chapter-track support.

The chapter-track update passes four automated data and lifecycle tests covering delayed cues, source priority, invalid timings, playlist changes and disposal. Browser rendering and live SSAI/CSAI behaviour have not yet been validated for this update.

The plugin clears its UI on `loadstart` and refreshes after metadata, duration or text-track changes. It also checks for delayed chapter and thumbnail cues every 500 ms, including while paused, and rebuilds only when the video, duration or cue data changes. Player disposal stops the monitor and resize observer.

#### Expected chapter behaviours

Thumbnail images are read from the loaded `metadata` text track labelled `thumbnails`, with the existing thumbnail VTT lookup as fallback. Relative image URLs and `#xywh` sprite crops are supported. Where thumbnail cues are unavailable, the video's thumbnail or poster is used. Failed images leave the chapter text available for navigation.

The built-in chapter menu, including Prism's chapter menu, remains intact. The plugin reads chapter cues without changing track modes or replacing the native chapter UI. The carousel still requires an advanced embed with space below the player.

### Behaviours

![video player](readme_images/video_player.gif)

* This plugin works with a [playlist enabled player](https://studio.support.brightcove.com/get-started/basics/video-cloud-basics-creating-playlist-player.html)
* Tooltips with chapter description appear alongside the chapter marker when hovered over on the player control bar
* Ad based cue points are ignored
* The colour of the cue markers can be defined in the Video Cloud player module as a JSON option
* Once chapters have been added the change will be detected by all deployed Brightcove players that have this plugin installed
* Intended for desktop web - Cue point elements have been hidden for mobile intentionally
* Configurable via JSON options for displaying chapters, markers or both
* Automatically includes loaded native text tracks with `kind: "chapters"`
* Combines chapter tracks with existing cue points and long-description timestamps, removing duplicate start times
* Chapter carousel entries support mouse clicks and Enter/Space keyboard navigation

#### Repo structure and purpose
<table>
  <thead>
    <tr>
      <th>Folder/Filename</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>index.html</td>
      <td>Basic finctionality of the plugin. HTML, CSS and JavaScript, in a single file.</td>
    </tr>
    <tr>
      <td>plugin/index.html</td>
      <td>The browsable HTML page that contains the HTML code, and the link to the CSS and the include to the JavaScript.</td>
    </tr>
    <tr>
      <td>plugin/cuepoints.js</td>
      <td>The JavaScript for the plugin.</td>
    </tr>
    <tr>
      <td>plugin/cuepoints.css</td>
      <td>The CSS for the plugin.</td>
    </tr>
  </tbody>
</table>

### Usage

#### Method 1: Chapters in the long description field

To have the chapters appear on the time player progress bar this plugin must be installed on a designated player.
Chapters can be pasted or typed into the [long description field](https://studio.support.brightcove.com/media/properties/editing-video-properties-using-media-module.html#videoinfo) in the media module or the [add code cue points using the cue points UI](https://studio.support.brightcove.com/media/general/working-cue-points-media-module.html).

![edit long description](readme_images/long_description.gif)

> **Note** The following chapters are an example of what can be placed in the long description field.
```
00:10 - Snow Hey Oh
01:04 - Sikamikanico
03:14 - Higher Ground
05:44 - Good Time Boys
06:51 - Scar Tissue
11:04 - By the Way
11:21 - LA Lakers
11:46 - Dark Necessities
12:20 - Aeroplane
```
Or
```
00:10 Agoraphobia
01:04 Aqueous Transmission
03:14 Drive
05:44 Are You In
06:51 Nice to Know You
11:04 Privilege
11:21 Wish you were here
11:46 Pardon Me
12:20 Megalomaniac
```
> Timestamps will be recognised in `HH:MM:SS`, `H:MM:SS`, `MM:SS` or `M:SS` formats.

In the above example there are hyphens but these are unnecessary to make make the plugin recognise chapters. Most characters such as `+`, `*`, `~`, `:` or `-` will be stripped so the "chapter tip" or "cue tip" will display correctly. Whitespace is also trimmed from the chapter description as well.\
Chapters or indexes that have timecode in the description will be ignored.\
For eample:
```
The sunrise 20:34
```
Will be ignored.\
\
Additionally time in seconds will be ignored.
```
120 Chapter name
```
> **Note** If the plugin detects a chapter duration that is greater than the video duration the illegal chapter will also be ignored.

Formats that will work:
```
02:32 No More Tears
2:32 - Perry Mason
0:23 Crazy Train
0:46
00:30 + Bark at the Moon
02:05:17 Mr Crowley
1:25:48 Patient Number 9
```
As mentioned the there is no need for a `00:00` chapter or "intro" as with **YouTube** to trigger the inclusion and recognition of the chapters.
> **Note** With little effort (for the tecchnically inclined) the plugin can be augmented to accept chapter data from a [custom field](https://studio.support.brightcove.com/admin/creating-custom-metadata-fields.html) to suit a more specific workflows.

> **Note** **Remember:** With this plugin you can use [cue points](https://studio.support.brightcove.com/media/general/working-cue-points-media-module.html) at the same time. Timestamps that are the same will be removed and the cue point metadata will override the chapter in the long description field.\
<strong style="color: hotpink;">Use `'CODE'` cue points. They will render on the player in the same way</strong> as chapters found in the long description field.

#### Method 2: Use cue points

![add cue points](readme_images/cue_points.gif)

This plugin is built to work with, without, or both chapters and cue points. Any duplication of events will be removed where the `'CODE'` based cue data is prioritised.\
Chapter metadata that is taken from the long description field is classified as a `'TEXT'` cue point.\
Both approaches can be used at the same time.

> **Note** Ad cue points are reserved to support advertsing activity for a video object and are ignored by this plugin.

More information on adding cue points and their types can be found here:
https://studio.support.brightcove.com/media/general/working-cue-points-media-module.html

#### Method 3: Native chapter text tracks

When the player has a loaded text track with `kind: "chapters"`, the plugin automatically reads its cues using `player.textTracks()`. This includes chapter tracks used by Brightcove's Prism UI.

Each cue's `startTime` supplies the marker and navigation time, and its `text` supplies the chapter title. Chapter titles are displayed as text rather than interpreted as HTML. No duplication into the long description or Video Cloud cue points is required.

All three methods can be used together. At an identical start time, the first available source in the following order wins:

| Priority | Source |
| --- | --- |
| 1 | Video Cloud CODE/TEXT cue points |
| 2 | Long-description timestamps |
| 3 | Native chapter text-track cues |

The existing `display`, colour and thumbnail-width options apply to every source. AD cue points, negative or invalid start times, and start times at or beyond the video duration are excluded. Videos without chapter tracks continue to use the original metadata sources.

Native chapter-track support is enabled by default. To use only cue points and long-description timestamps, add `"chapter_tracks": false` to the plugin options:

```json
{
  "display": "both",
  "chapter_tracks": false,
  "cue_marker_color": "#FFF",
  "chapter_bg_color": "transparent",
  "thumbnail_w": "144"
}
```

Omit `chapter_tracks`, or set it to `true`, to include native chapters. This feature adds chapters to the existing markers and carousel; it does not generate chapter metadata or add a segmented progress bar.

#### Cue marker colours
When the plugin is being configured a **Video Cloud** user has the option of setting the marker colour, chapter background and the chapter thumbnail dimensions as follows:
* `cue_marker_color` controls the colour of the the marker that appears on the player scrub bar. If this JSON value is not present it will default to white or `#FFF`
* `chapter_bg_color` sets the colout of the chapter thumbnail carousel background colour below the player. If this JSON value is not present it will default to transparent.
* `thumbnail_w` sets the dimensoions for the chapter thumbnail image by stipulating a width. It will default to `144` if the JSON value is not present or not conforming to a `numerical` format.

```json
{
    "cue_marker_color": "#FF69B4",
    "chapter_bg_color": "#FF69B4",
    "thumbnail_w": "288"
}
```
Or
```json
{
    "cue_marker_color": "hotpink",
    "chapter_bg_color": "hotpink",
    "thumbnail_w": "72"
}
```
Or with some opacity?

```json
{
    "cue_marker_color": "rgba(245, 39, 145, 0.5)",
    "chapter_bg_color": "rgb(245, 39, 145)",
    "thumbnail_w": "144"
}
```
![edit cue colour](readme_images/options.gif)

#### Display of plugin features
As part of the same configuration options the player can be set to display the chaper markers on the scrub bar or to display the chapter thumbnails under the player. The JSON config is as follows:
```json
{
  "display": "chapters",
  "cue_marker_color": "#00F",
  "chapter_bg_color": "Cornsilk",
  "thumbnail_w": "145"
}
```
The above example forces the player to display the chapters only whereas the following example sets the player to only display the markers on the scrub bar.
```json
{
  "display": "markers",
  "cue_marker_color": "#000",
  "chapter_bg_color": "Cornsilk",
  "thumbnail_w": "140"
}
```
If you would like to display both thumbnail chapters below the player and markers with descriptions on the scrub bar you have the option of defining the options as follows:
```json
{
  "display": "both",
  "cue_marker_color": "#000",
  "chapter_bg_color": "#FFF",
  "thumbnail_w": "132"
}
```
If the `display` option is not present the plugin will automattically set the display for *both* chapters and markers.

### Installation
Please follow the [well documented guide on installing plugins](https://player.support.brightcove.com/coding-topics/step-step-plugin-development.html#Deploy_the_plugin) for a Brightcove player. This is considered to be a **custom** plugin as the references to the JavaScript file, CSS file and adding the JSON options are essential.\
Key ingredients: The [JavaScript file](plugin/cuepoints.js), [the CSS file](plugin/cuepoints.css) and [adding options JSON](https://studio.support.brightcove.com/players/general/configuring-player-plugins.html#add_plugin) to the plugin configuration as _illustrated above_.
#### It's all in the name: 
Make sure the plugin is named `cuePointChaptersPlugin` in the `plugin name` field in the Video Cloud players module.
Watch the video at the following Brightcove docs page on how to install a plugin. The guide details the plugin name quite well.
https://player.support.brightcove.com/basics/developer-basics-custom-plugin-using-studio.html

> :warning: **Disclaimer**
> * As this plugin has been created for demonstration purposes it is not officially supported by Brightcove
> * This plugin is not intended for production deployment. If this plugin is utilised for production deployment it is done so  at the users or entities risk. All appropriate testing, applicable coding standards and security is the responsibility of the deployer/user.
> * It is the users/deployers responsibility to host the plugin files so they are accessible to the Brightcove player.
> * This plugin is not covered under the Brightcove support agreement.

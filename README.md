# Brightcove - cue point markers plugin

A Brightcove player plugin that adds cue point markers and associated metadata dynamically to the player progress bar.
The plugn prioritises the cue metadata form Video Cloud over the "chapter" metadata associated with the video object.\
Unlike other implementations of chaptering there is no need for the admin to add an index or marker at `00:00` of the video.\
\
This implementation has been tested against the Brightcove player version 7.2 and 6.67.\
Browser testing has been mild but **Firefox 110.0.1**, **Chrome 111.0.5563.64** and **Safari 16.3** have done the rounds. Edge requires a review.\
\
**What remains untested:** The running of this plugin alongside the IMA ads plugin needs more thorough testing in the context of Server Side Ad Insertion and Client Side Ad Insertion where chapters are used to trigger mid-roll video ads.

### Behaviours

![video player](readme_images/video_player.gif)

* This plugin works with a [playlist enabled player](https://studio.support.brightcove.com/get-started/basics/video-cloud-basics-creating-playlist-player.html)
* Tooltips with chapter description appear alongside the chapter marker when hovered over on the player control bar
* Ad based cue points are ignored
* The colour of the cue markers can be defined in the Video Cloud player module as a JSON option
* Once chapters have been added the change will be detected by all deployed Brightcove players that have this plugin installed
* Intended for desktop web - Cue point elements have been hidden for mobile intentionally

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

#### Cue marker colours
When the plugin is being configured a **Video Cloud** user has the option of setting the marker colour as follows:

```json
{
    "cue_marker_color": "#FF69B4"
}
```
Or
```json
{
    "cue_marker_color": "hotpink"
}
```
Or with some opacity?

```json
{
    "cue_marker_color": "rgba(245, 39, 145, 0.5)"
}
```
![edit cue colour](readme_images/options.gif)

### Installation
Please follow the [well docemented guide on installing plugins](https://player.support.brightcove.com/coding-topics/step-step-plugin-development.html#Deploy_the_plugin) for a Brightcove player. This is considered to be a **custom** plugin as the references to the JavaScript file, CSS file and adding the JSON options are essential.\
Key ingredients: The [javascript file](cuepoints.js), [the CSS file](cuepoints.css) and [adding options JSON](https://studio.support.brightcove.com/players/general/configuring-player-plugins.html#add_plugin) to the plugin configuration as _illustrated above_.
#### It's all in the name: 
Make sure the plugin is named `cuePointMarkersPlugin` in the `plugin name` field in the Video Cloud plyers module.
Watch the video at the following Brightcove docs page on how to install a plugin. The guide details the plugin name quite well.
https://player.support.brightcove.com/basics/developer-basics-custom-plugin-using-studio.html

> :warning: **Disclaimer**
> * As this plugin has been created for demonstration purposes it is not officially supported by Brightcove
> * This plugin is not intended for production deployment. If this plugin is utilised for production deployment it is done so  at the users or entities risk. All appropriate testing, applicable coding standards and security is the responsibility of the deployer/user.
> * It is the users/deployers responsibility to host the plugin files so they are accessible to the Brightcove player.
> * This plugin is not covered under the Brightcove support agreement.

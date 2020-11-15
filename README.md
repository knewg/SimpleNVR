# SimpleNVR
A simple NVR software that takes input from IP cameras (RTSP) and stores it to disk in real time speed, and fast forwarded speed. This is a backend application only and any front end application will be made in another repository. I am using this software with Samba for access to footage.

## Installation
You'll need NodeJS and FFMPEG. I'll write some better installation instructions and a docker file later.

## Usage
1. Edit config file

2. `node src/simplenvr.js`

## Background
I got really disappointed with the abysmal range of NVR software out there in the open source world. I've tried everything that works on linux and nothing really worked properly. Either the interface was incredibly slow, or the software didn't even work. I haven't worked with programming for many years, so this was a perfect opportunity to test out NodeJS. So sorry if the code isn't up to par.

## Current state
The software is currently working and gathering video footage, and creates fast forward recaps every day. It has no motion detection, it has no automatic data retention routines, and the documentation is not very helpful.

## Objectives

### MVP: Do something - DONE
Store video from my ip cameras and create "fast forward" chunks for quick reviewing. Auto rotate daily to new files and create a self explanatory archive.

### Motion detection
Implement Motion support to create a "highlight reel" with movement. Maybe even some trigger support upon finishing to send out morning recaps

### Packaging and distribution
Much better documentation, moving config to config file, distributing options, dockerfiles etc.

### Data retention 
Needs some cleanup routine otherwise the disk will fill in a couple of months. Retention intervals will be configurable.

### Restructure restructure restructure
When I first set out I was going to write a simple ffmpeg script in bash, so the program flow is kind of... "not very elegant". I would like to restructure this in a more elegant way with more event based interrupts and other cool stuff. I'm working full time, and I'm a farmer in my spare time so this project was cobbled together in a couple of hours and without planning. Please don't judge me too hard.


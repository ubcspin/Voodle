# Voodle
Vocal prototyping for physical user interfaces.

--

###Setting up Voodle:
* 1. Clone Voodle by opening a terminal window and navigating to a directory of your choice and typing: `git clone https://github.com/ubcspin/Voodle.git`. (You need git in your path to do this, if you don't want to install git you can download Voodle as a zip directly from github).
* 1a. **If you are a Windows user** make sure you've got all of your build tools in order. Instructions below.
* 2. Note the two JSON files: `package[mac_use_this].json` and `package[windows_use_this].json.` If you are running OSX or linux rename `package[mac_use_this].json` -> `package.json`. If you are running Windows rename `package[windows_use_this].json` -> `package.json`. 
* 3. Install [Node here](https://nodejs.org/en/). After the install, you may have to restart terminal.
* 4. Open a terminal window and navigate to the root Voodle directory. Type: `npm install`.
* 5. Next, install React by typing `npm install react`.
 
* 6. You will need to manually install the node-module 'node-core-audio'. The process is as follows:



	* **Windows/OSX users:**
		* 7. Clone the git repository `https://github.com/ZECTBynmo/node-core-audio.git` into your `node_modules` folder.

		* 8. Navigate into your `node-core-audio` folder and run `node-gyp rebuild`. It is possible that you need to install node-gyp by typing (perhaps as sudo) `npm install -g node-gyp`.

		Note 0: Windows users may need to install Python 2.7 and msvs:  
		type `npm i -g --production windows-build-tools` as administrator. This should install the requisite packages.  
		- You will also need to set your msvs version number. Say you've installed 2015. Type `npm config set msvs_version 2015`.
			- Alternatively, you can specify your msvs version during runtime. `cd` into node-core-audio and type `node-gyp rebuild --msvs_version=2015`.	

		Note 1: if you are running Python >3:
		make sure Python < 3 && >= 2.7 is installed
			run `node-gyp rebuild --python=python2.7`

		Note 2: You MAY need to install the 'nan' package:
			`cd` to `node-core-audio`
			`npm i nan`


		Note 3: If you are still having node-gyp problems ensure that you have the requisite dependencies outlined here: https://www.npmjs.com/package/node-gyp .
		
	* **Linux users:**
		* Clone the git repository `https://github.com/ZECTBynmo/node-core-audio.git` into your `node_modules` folder.
		* Navigate into your `node-core-audio` folder and replace `portaudio` with this source `http://www.portaudio.com/archives/pa_stable_v19_20140130.tgz`.
		* In the `portaudio` folder type: `./configure`;(sudo)`make install`.
		* cd .. back to your `node-core-audio` folder and open the `binding.gyp` file. Replace the `OS=="linux"',{...}` clause with the following:
		```
		'OS=="linux"', {
		"libraries" : [
		'<(module_root_dir)/portaudio/lib/.libs/libportaudio.so',
		'<(module_root_dir)/portaudio/include/portaudio.h'
		],
		'cflags': [ "-fno-exceptions -lrt -lasound -ljack -lpthread -fPIC" ],
		'cflags!': [ "-fno-exceptions-lrt -lasound -ljack -lpthread -fPIC" ],
		'cflags_cc!': [ "-fno-exceptions -lrt -lasound -ljack -lpthread -fPIC"],
		'cflags_cc': [ "-std=c++0x -lrt -lasound -ljack -lpthread -fPIC" ]
		}
		```

		* In the `node-core-audio` folder run `node-gyp rebuild`.
		* Dearest linux users, if you find you are running into new install problems, even if solved them yourselves, please notify me at damarino (at) cs.ubc.ca.


**Windows Build tools**

type `npm i -g --production windows-build-tools` as administrator. This should install the requisite packages.  

You will also need to set your msvs version number. Say you've installed 2015. Type `npm config set msvs_version 2015`.

If you're getting an error with `VCBuild.exe` or `MSBuild.exe`, you may need to add to your path. Go to `Control Panel > System > Advanced... > Environment Variables`, then add to the PATH system variable (double-check this path exists on your machine!): `C:\Program Files (x86)\MSBuild\14.0\Bin`.

###Running Voodle:
* Note: the following steps must be done in `/Voodle`:
* First you will need to deploy. This only needs to be done once with each stable version. Open a terminal window and type `npm run deploy`.
	* Note (optional): If you are looking to do some development of your own you can run the dev server with `npm run dev` at `localhost:1337`.
* To start Voodle, type `npm start`.
* Open a new browser window and go to `localhost:2000`.
* Just have fun.

###Setting up the Arduino

![wiring diagram](https://raw.githubusercontent.com/ubcspin/Voodle/master/images/wiring_diagram.jpg)

Power pin can be any 3-6V source. Ground pin must be common with the microcontroller, i.e., you can use any ground as long as it is connected to an Arduino ground. Data pin must be one of the PWM pins on the Arduino. In this case, it’s pin 10.

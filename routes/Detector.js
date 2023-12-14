(async()=>{
  "use strict";

  // Dependencies
  const { runJobs } = require("parallel-park")
  const request = require("request-async")
  const shellJS = require("shelljs")
  const moment = require("moment")
  const fs = require("fs")

  // Variables
  const installedPackages = []
  const result = []

  // Main
  console.log("Reviewing installed packages, please wait...")
  let packages = shellJS.exec("npm list", {silent: true}).stdout;
  packages = packages.match(/-.*\w+@\w+.\w+.\w+/g)

  for( const p of packages ) installedPackages.push(p.replace(/-- |@.*/g, ""))

  console.log(`${installedPackages.length} installed packages found.`)

  await runJobs(
      installedPackages,
      async(p)=>{
        try{
          let response = await request(`https://socket.dev/api/npm/package-info/score?name=${p}`)
          response = JSON.parse(response.body)["score"];

          const supplyChainRisk = response.supplyChainRisk["score"];
          const quality = response.quality["score"];
          const license = response.license.license

          // if(0.79 > supplyChainRisk) console.log(`${p} | Supply Chain Risk: Lower than 0.79`)
          // if(0.49 > quality) console.log(`${p} | Quality: Lower than 0.49`)
          // if(0.79 > license) console.log(`${p} | License: Lower than 0.79`)

          response = await request(`https://snyk.io/advisor/npm-package/${p}`)
          response = response.body

          if(response.match("This is a malicious package")) console.log(`${p} | Malicious`)

          result.push({ name: p, malicious: !!response.match("This is a malicious package"), supplyChainRisk: supplyChainRisk, quality: quality, license: license })
        }catch{}
      },
      {
        concurrency: 50
      }
  )

  const outputFile = `./results/${moment().format("LLLL").replace(":", "")}.json`

  console.log("Saving the results, please wait...")
  fs.writeFileSync(outputFile, JSON.stringify(result), "utf8")
  console.log(`Results has been saved to ${outputFile}`)
})()

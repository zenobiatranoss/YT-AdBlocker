import {
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises"

import {
  join
} from "node:path"

const sources = [
  [
    "youtube",
    [
      "rules/youtube/ads.rules",
      "rules/youtube/cosmetic.rules",
      "rules/youtube/exceptions.rules",
      "rules/youtube/player.rules"
    ]
  ],
  [
    "general",
    [
      "rules/general/ads.rules",
      "rules/general/privacy.rules",
      "rules/general/tracking.rules",
      "rules/general/easylist.rules",
      "rules/general/easyprivacy.rules",
      "rules/general/peter-lowe.rules"
    ]
  ]
]

await mkdir(
  "dist/extension/rules",
  { recursive: true }
)

await mkdir(
  "extension/src/generated",
  { recursive: true }
)

for (
  const [name, files]
  of sources
) {
  const contents =
    await Promise.all(
      files.map(
        async file => {
          try {
            return await readFile(
              file,
              "utf8"
            )
          } catch {
            return ""
          }
        }
      )
    )

  const rules =
    [
      ...new Set(
        contents
          .join("\n")
          .split(/\r?\n/)
          .map(
            line =>
              line.trim()
          )
          .filter(Boolean)
      )
    ]

  await writeFile(
    join(
      "dist/extension/rules",
      `${name}.json`
    ),
    JSON.stringify(
      {
        name,
        version: "0.2.0",
        rules
      },
      null,
      2
    )
  )

  await writeFile(
    join(
      "extension/src/generated",
      `${name}-rules.ts`
    ),
    `export const ${name}Rules = ${JSON.stringify(rules)} as const\n`
  )
}

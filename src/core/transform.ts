import { MagicString, compileScript } from '@vue/compiler-sfc'
import { DEFINE_OPTIONS_NAME } from './constants'
import {
  checkInvalidScopeReference,
  filterMarco,
  hasPropsOrEmits,
  parseSFC,
} from './utils'
import type { TransformResult } from 'unplugin'

export const transform = (code: string, id: string): TransformResult => {
  if (!code.includes(DEFINE_OPTIONS_NAME)) return

  const sfc = parseSFC(code, id)
  if (!sfc.scriptSetup) return

  if (!sfc.scriptSetup.scriptSetupAst) {
    sfc.scriptSetup = compileScript(sfc, {
      id,
    })
  }
  const { script, scriptSetup, source } = sfc

  const nodes = filterMarco(scriptSetup)
  if (nodes.length === 0) return
  else if (nodes.length > 1)
    throw new SyntaxError(`duplicate ${DEFINE_OPTIONS_NAME}() call`)

  if (script)
    throw new SyntaxError(
      `${DEFINE_OPTIONS_NAME} cannot be used, with both script and script-setup.`
    )

  const node = nodes[0]
  const arg = node.arguments[0]
  if (!(node.arguments.length === 1 && arg.type === 'ObjectExpression')) {
    throw new SyntaxError(`${DEFINE_OPTIONS_NAME}() arguments error`)
  }

  if (hasPropsOrEmits(arg)) {
    throw new SyntaxError(
      `${DEFINE_OPTIONS_NAME}() please use defineProps or defineEmits instead.`
    )
  }

  checkInvalidScopeReference(arg, DEFINE_OPTIONS_NAME, scriptSetup)

  const argText = scriptSetup.loc.source.slice(arg.start, arg.end)

  const s = new MagicString(source)
  const lang = scriptSetup.attrs.lang ? ` lang="${scriptSetup.attrs.lang}"` : ''
  s.prepend(`<script${lang}>\nexport default ${argText}</script>\n`)
  s.remove(
    scriptSetup.loc.start.offset + node.start,
    scriptSetup.loc.start.offset + node.end
  )

  return {
    code: s.toString(),
    get map() {
      return s.generateMap({
        source: id,
        includeContent: true,
      })
    },
  }
}

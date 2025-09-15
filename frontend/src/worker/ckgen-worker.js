// Module Worker: heavy shortint key generation off main thread

self.onmessage = async (ev) => {
  const data = ev.data || {}
  if (data.t !== 'gen') return
  try {
    const tfheModuleUrl = data.tfheModuleUrl || '/tfhe/tfhe.js'
    const absUrl = /^https?:\/\//.test(tfheModuleUrl)
      ? tfheModuleUrl
      : new URL(tfheModuleUrl, self.location.origin).toString()
    const tfhe = await import(/* webpackIgnore: true */ absUrl)
    if (typeof tfhe.default === 'function') {
      await tfhe.default()
    }

    const name = data.paramName || 'V0_11_PARAM_MESSAGE_4_CARRY_2_KS_PBS_GAUSSIAN_2M64'
    const params = new tfhe.ShortintParameters(tfhe.ShortintParametersName[name])
    self.postMessage({ t: 'progress', phase: 'params_ready' })
    const cks = tfhe.Shortint.new_client_key(params)
    self.postMessage({ t: 'progress', phase: 'client_key_ready' })
    self.postMessage({ t: 'progress', phase: 'server_key_start' })
    const c_sks = tfhe.Shortint.new_compressed_server_key(cks)
    self.postMessage({ t: 'progress', phase: 'compressed_server_key_ready' })

    const cks_bytes = tfhe.Shortint.serialize_client_key(cks)
    const sk_bytes = tfhe.Shortint.serialize_compressed_server_key(c_sks)
    self.postMessage({ t: 'keys', client_key_bytes: cks_bytes.buffer, c_sks_bytes: sk_bytes.buffer }, [cks_bytes.buffer, sk_bytes.buffer])
  } catch (e) {
    self.postMessage({ t: 'err', msg: String(e?.message || e), stack: String(e?.stack || '') })
  }
}



const HTTPError = (error, req, res, next) => res.status(500).json({ error: 'Ocorreu algum erro ao tentar realizar essa operação.' })

export { HTTPError }

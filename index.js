const bitwork = require('bitwork')
const { spawn } = require('child_process')
const tape = require('./tape')
const command = require('./command')
const processor = require('./processor')
class Planaria {
  start (gene) {
    if (!gene.tape) gene.tape = process.cwd()
    this.gene = gene;
    this.gene.defaultParser = (gene.filter && gene.filter.host && gene.filter.host.parse ? gene.filter.host.parse : "bob");
    this.tapePath = gene.tape + "/tape.txt"
    let chain = gene.chain || {}
    this.gene.chain = chain;
    let o = Object.assign({}, gene.filter.host, gene.filter.peer)
    this.crawler = { block: new bitwork(o), mempool: new bitwork(o) };
    ["block", "mempool"].forEach((type) => {
      this.crawler[type].use("parse", this.gene.defaultParser)
      if(this.gene.filter && this.gene.filter.l && this.gene.filter.l.map) this.crawler[type].use("map", this.gene.filter.l.map)
      if(this.gene.filter && this.gene.filter.l && this.gene.filter.l.filter) this.crawler[type].use("filter", this.gene.filter.l.filter)
      this.cmd = new command({ gene: this.gene, crawler: this.crawler })
      this.ps = new processor({ gene: this.gene, crawler: this.crawler, cmd: this.cmd })
    });
    Promise.all([
      this.wait("block"),
      this.wait("mempool")
    ]).then(async () => {
      let info = await this.crawler.block.get("info")
      let current = await tape.current({ start: 1, end: info.blocks }, this.gene)
      await this.cmd.START(current);
      await this.ps.next()
    });
  }
  wait(type) {
    return new Promise((resolve, reject) => {
      this.crawler[type].on("ready", () => {
        resolve();
      })
    })
  }
  async rewind (id){
    await this.cmd.REWIND(id)
    await this.ps.next()
  }
  exec (cmd, args, options) {
    return new Promise(function(resolve, reject) {
      if (options) {
        options.stdio = 'inherit'
      } else {
        options = { stdio: 'inherit' }
      }
      console.log("PLANARIA", "exec()", cmd, args, options);
      let ps = spawn(cmd, args, options)
      ps.on('exit', resolve)
    })
  }
}
module.exports = Planaria

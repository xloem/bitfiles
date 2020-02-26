let mattercloud = require('mattercloudjs').instance({
  api_key: '4ZiBSwCzjgkCzDbX9vVV2TGqe951CBrwZytbbWiGqDuzkDETEkLJ9DDXuNMLsr8Bpj'
})


async function broadcast(tx)
{
	const res = await mattercloud.sendRawTx(tx);
	return res.txid
}

module.exports = {
	broadcast: broadcst
}

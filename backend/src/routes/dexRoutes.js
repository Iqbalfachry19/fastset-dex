import express from 'express';
import { dexController } from '../controllers/dexController.js';
import { bridgeController } from '../controllers/bridgeController.js';

const router = express.Router();

router.post('/pool/info', (req, res) => dexController.getPoolInfo(req, res));

router.post('/swap/calculate', (req, res) => dexController.calculateSwap(req, res));
router.post('/swap/execute', (req, res) => dexController.executeSwap(req, res));
router.post('/swap/settle', (req, res) => dexController.settleSwapPayout(req, res));

router.post('/liquidity/add/calculate', (req, res) => dexController.calculateAddLiquidity(req, res));
router.post('/liquidity/add/execute', (req, res) => dexController.executeAddLiquidity(req, res));

router.post('/liquidity/remove/calculate', (req, res) => dexController.calculateRemoveLiquidity(req, res));
router.post('/liquidity/remove/execute', (req, res) => dexController.executeRemoveLiquidity(req, res));
router.post('/liquidity/remove/settle', (req, res) => dexController.settleRemoveLiquidityPayout(req, res));

router.post('/liquidity/balance', (req, res) => dexController.getUserLPBalance(req, res));

router.post('/account/info', (req, res) => dexController.getAccountInfo(req, res));
router.post('/certificate/by-nonce', (req, res) => dexController.getCertificateByNonce(req, res));
router.post('/transaction/submit-signed', (req, res) => dexController.submitSignedTransaction(req, res));
router.post('/state/reset', (req, res) => dexController.resetState(req, res));
router.post('/bridge/cross-sign-cert', (req, res) => bridgeController.crossSignCert(req, res));
router.post('/bridge/execute-intent', (req, res) => bridgeController.executeIntent(req, res));

export default router;

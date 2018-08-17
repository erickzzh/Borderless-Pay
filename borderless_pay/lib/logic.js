/**
 * @param {org.acme.BankingGroup.regularAudit} regularAudit
 * @transaction
 */
function regularAudit(regularAudit){
    //by the time we run this function an asset will already be created
    //this function is excuted when the bank submit a paymentaction (pre-payment)
    var factory = getFactory(); 
    var NS = 'org.acme.BankingGroup';

    var sender = getCurrentParticipant().getIdentifier();
    var senderCheck = regularAudit.payment.from.memberID;
    if (sender != senderCheck){
        throw new Error("system got hacked");
    }
    var receiverCountry = regularAudit.payment.to.Country;
    var senderCountry = regularAudit.payment.from.Country;
    var amount = regularAudit.payment.amount;
    

    //if it is over 50K then assign a regulator
    if (amount > 50000){
        return getAssetRegistry('org.acme.BankingGroup.payment')
            .then(function (AssetRegistry) {
                // update the regulator.
                regularAudit.payment.networkRegulator = factory.newRelationship(NS,'Regulator','Regulator');
                // update the govermentAgent
                regularAudit.payment.senderAgent = factory.newRelationship(NS,'GovermentAgencies',senderCountry + "-Agency");
                regularAudit.payment.receiverAgent = factory.newRelationship(NS,'GovermentAgencies',receiverCountry + "-Agency");
                //update the status
                regularAudit.payment.status = "AUDITING";                
                return AssetRegistry.update(regularAudit.payment);
        })
    }
    //need to make the payment go through. Credit and debit the two banks and call it a dayy
    //else the payment
    return getAssetRegistry('org.acme.BankingGroup.payment')
        .then(function (AssetRegistry) {
            // update the govermentAgent
            regularAudit.payment.senderAgent = factory.newRelationship(NS,'GovermentAgencies',senderCountry + "-Agency");
            regularAudit.payment.receiverAgent = factory.newRelationship(NS,'GovermentAgencies',receiverCountry + "-Agency");
            //update the status
            regularAudit.payment.status = "APPROVED"; 
            return AssetRegistry.update(regularAudit.payment);
        })
        .then(function(){
            return getParticipantRegistry('org.acme.BankingGroup.Bank');
        })
        .then(function(ParticipantRegistry){
            //update the amount in the sender account
            regularAudit.payment.from.accountBalance -= amount;
            //update the amount int he receiver account
            regularAudit.payment.to.accountBalance += amount;

            return ParticipantRegistry.updateAll([regularAudit.payment.from,regularAudit.payment.to]);
        })
    
}

/**
 * @param {org.acme.BankingGroup.auditProcess} auditProcess
 * @transaction
 */
function auditProcess(auditProcess){
    var factory = getFactory(); 
    var NS = 'org.acme.BankingGroup';
    var amount = auditProcess.payment.amount;

    if (auditProcess.decision == "approve"){
        auditProcess.payment.status = "APPROVED";
        auditProcess.payment.memo = auditProcess.memo;

        return getParticipantRegistry('org.acme.BankingGroup.Bank')
            .then(function(ParticipantRegistry){
                auditProcess.payment.from.accountBalance -= amount;
                auditProcess.payment.to.accountBalance += amount;
                return ParticipantRegistry.updateAll([auditProcess.payment.from,auditProcess.payment.to]);
            })
            .then(function(){
                return getAssetRegistry('org.acme.BankingGroup.payment');
            })
            .then(function(AssetRegistry){
                return AssetRegistry.update(auditProcess.payment)
            })
    }

    else if (auditProcess.decision == "deny"){
        auditProcess.payment.status = "DENIED";
        auditProcess.payment.memo = auditProcess.memo;
        return getAssetRegistry('org.acme.BankingGroup.payment')
            .then(function(AssetRegistry){
                return AssetRegistry.update(auditProcess.payment)
            })
    }

}


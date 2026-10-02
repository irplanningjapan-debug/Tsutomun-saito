'use client'

import { ApplicationModal, ActivityDetailModal, EventDetailModal } from './activity-modals'
import { ApplicantListModal } from './applicant-list-modal'
import { DeleteAccountModal, MyPageModal, ProfileEditModal, RenewalConfirmModal, WithdrawalModal } from './mypage-modals'
import { AuthModal, ParticipationModal } from './auth-participation-modals'
import { LegalModal } from './legal-modal'
import { RegistrationModal } from './registration-modal'
import { SupportHubModal } from './support-hub-modal'
import { ShareItemFormModal } from './share-item-form-modal'
import { ShareContactModal } from './share-contact-modal'

export function ModalsRoot() {
  return (
    <>
      <ApplicationModal />
      <ActivityDetailModal />
      <ApplicantListModal />
      <MyPageModal />
      <ProfileEditModal />
      <DeleteAccountModal />
      <WithdrawalModal />
      <RenewalConfirmModal />
      <AuthModal />
      <ParticipationModal />
      <EventDetailModal />
      <LegalModal />
      <RegistrationModal />
      <SupportHubModal />
      <ShareItemFormModal />
      <ShareContactModal />
    </>
  )
}

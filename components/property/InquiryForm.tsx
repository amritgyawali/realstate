'use client';

import { useState } from 'react';
import type { Agent, Property } from '@/lib/types';

interface InquiryFormProps {
  property: Property;
  agent: Agent;
}

/**
 * Lead capture. Posts to the local API route, which in a production deployment
 * would hand off to the brokerage CRM; here it validates, acknowledges and keeps
 * the submitted values so nothing is lost on a failed send.
 */
export function InquiryForm({ property, agent }: InquiryFormProps) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setState('sending');
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          propertySlug: property.slug,
          propertyTitle: property.title,
          agentSlug: agent.slug,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      setState('sent');
      setMessage(`Sent to ${agent.name}. Expect a reply within one business day.`);
      form.reset();
    } catch {
      setState('error');
      setMessage('That did not send. Try again, or email the agent directly.');
    }
  };

  return (
    <div data-purpose="request-more-info-form">
      <h2 className="mb-3 border-b border-gray-200 pb-1.5 font-serif-title text-[18px] font-normal text-gray-900">
        Request More Information
      </h2>

      {state === 'sent' ? (
        <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-start gap-2 text-[12px] text-emerald-900">
            <i className="fa-solid fa-circle-check mt-0.5 text-emerald-600" aria-hidden="true" />
            {message}
          </p>
          <button
            type="button"
            onClick={() => setState('idle')}
            className="mt-3 text-[11px] font-semibold text-emerald-800 underline"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="mb-0.5 block text-[11.5px] text-gray-600" htmlFor="inquiry-name">
              Name
            </label>
            <input
              id="inquiry-name"
              name="name"
              required
              type="text"
              placeholder="Your Name"
              className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs focus:border-sky-700 focus:ring-1 focus:ring-sky-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block text-[11.5px] text-gray-600" htmlFor="inquiry-email">
                Email
              </label>
              <input
                id="inquiry-email"
                name="email"
                required
                type="email"
                placeholder="your@email-address"
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs focus:border-sky-700 focus:ring-1 focus:ring-sky-700"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[11.5px] text-gray-600" htmlFor="inquiry-phone">
                Phone
              </label>
              <input
                id="inquiry-phone"
                name="phone"
                type="tel"
                placeholder="(201) 555-5555"
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs focus:border-sky-700 focus:ring-1 focus:ring-sky-700"
              />
            </div>
          </div>
          <div>
            <label className="mb-0.5 block text-[11.5px] text-gray-600" htmlFor="inquiry-message">
              Message
            </label>
            <textarea
              id="inquiry-message"
              name="message"
              rows={3}
              placeholder="Your message to the listing agent."
              defaultValue={`I would like to arrange a private viewing of ${property.title}.`}
              className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs focus:border-sky-700 focus:ring-1 focus:ring-sky-700"
            />
          </div>
          <fieldset className="pt-1 text-[11px] text-gray-600">
            <legend className="mr-2 inline">Preferred Contact Method</legend>
            <label className="mr-2 inline-flex items-center">
              <input
                type="checkbox"
                name="contactEmail"
                defaultChecked
                className="h-3 w-3 rounded border-gray-300 text-sky-700 focus:ring-0"
              />
              <span className="ml-1">Email</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                name="contactSms"
                className="h-3 w-3 rounded border-gray-300 text-sky-700 focus:ring-0"
              />
              <span className="ml-1">Text/SMS</span>
            </label>
          </fieldset>

          {state === 'error' && (
            <p className="rounded-sm border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] text-rose-800">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={state === 'sending'}
            className="w-full rounded bg-[#3e454f] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#2c323a] disabled:opacity-60"
          >
            {state === 'sending' ? 'Sending…' : 'Submit Request'}
          </button>
        </form>
      )}
    </div>
  );
}
